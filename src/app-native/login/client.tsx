"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, Lock, Mail, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { memberLogin, resetPasswordByEmail } from "@/lib/native-api/auth";
import { createClient } from "@/lib/supabase/client";
import { nativeGoogleSignIn } from "@/lib/google-auth";
import { nativeAppleSignIn, isIOSPlatform } from "@/lib/apple-auth";

function formatPhoneDisplay(value: string): string {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/my";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 비밀번호 찾기 상태
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => { isIOSPlatform().then(setIsIOS); }, []);

  const rawPhone = phone.replace(/\D/g, "");

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();

      // 네이티브 앱: Capacitor GoogleAuth 플러그인 사용
      const nativeUser = await nativeGoogleSignIn();

      if (nativeUser) {
        // 네이티브: idToken으로 Supabase 로그인
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: nativeUser.idToken,
        });
        if (error) {
          toast.error("구글 로그인 실패", { description: error.message || "다시 시도해주세요." });
          setGoogleLoading(false);
          return;
        }

        // members 테이블 확인: id 또는 google_uid로 매칭
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: memberById } = await supabase
            .from("members")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (memberById) {
            router.push(redirectPath);
            return;
          }

          // google_uid로 매칭 (이미 연결된 계정)
          const { data: memberByGuid } = await supabase
            .from("members")
            .select("id")
            .eq("google_uid", user.id)
            .maybeSingle();

          if (memberByGuid) {
            router.push(redirectPath);
            return;
          }

          // 매칭 안 됨 → 전화번호로 계정 연결 페이지
          router.push("/google-link");
          return;
        }
        setGoogleLoading(false);
      } else {
        // 웹 브라우저: PKCE 리다이렉트
        const webCallbackUrl = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: webCallbackUrl },
        });
        if (error) {
          toast.error("구글 로그인 실패", { description: error.message });
          setGoogleLoading(false);
        }
      }
    } catch (err) {
      console.error("[GoogleLogin] handleGoogleLogin 에러:", err);
      toast.error("오류가 발생했습니다", { description: "다시 시도해주세요." });
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      const supabase = createClient();
      const appleUser = await nativeAppleSignIn();
      if (!appleUser) {
        toast.error("Apple 로그인 실패", { description: "다시 시도해주세요." });
        setAppleLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: appleUser.idToken,
      });
      if (error) {
        toast.error("Apple 로그인 실패", { description: error.message || "다시 시도해주세요." });
        setAppleLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAppleLoading(false); return; }

      const { data: memberById } = await supabase.from("members").select("id").eq("id", user.id).maybeSingle();
      if (memberById) { router.push(redirectPath); return; }

      const { data: memberByApple } = await supabase.from("members").select("id").eq("apple_uid", user.id).maybeSingle();
      if (memberByApple) { router.push(redirectPath); return; }

      router.push("/signup/complete?provider=apple");
    } catch (err) {
      console.error("[AppleLogin] 에러:", err);
      toast.error("오류가 발생했습니다", { description: "다시 시도해주세요." });
      setAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!rawPhone || !password) {
      setError("전화번호와 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    const result = await memberLogin(rawPhone, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      toast.error("로그인 실패", { description: result.error });
      return;
    }

    toast.success("로그인 성공!");
    router.push(redirectPath);
    router.refresh();
  };

  const handleForgotSubmit = async () => {
    setForgotError("");

    if (!forgotEmail || !forgotEmail.includes("@")) {
      setForgotError("올바른 이메일을 입력해주세요.");
      return;
    }

    setForgotLoading(true);
    const result = await resetPasswordByEmail(forgotEmail);
    setForgotLoading(false);

    if (result.error) {
      setForgotError(result.error);
      return;
    }

    setForgotSent(true);
  };

  const handleBackToLogin = () => {
    setShowForgot(false);
    setForgotSent(false);
    setForgotEmail("");
    setForgotError("");
  };

  // 비밀번호 찾기 화면
  if (showForgot) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <KeyRound className="h-6 w-6 text-orange-500" />
            </div>
            <CardTitle className="text-xl">비밀번호 찾기</CardTitle>
            <CardDescription>
              회원정보에 등록된 이메일을 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {forgotError && (
              <div className="animate-in slide-in-from-top-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {forgotError}
              </div>
            )}

            {!forgotSent ? (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="이메일 (example@email.com)"
                    className="pl-10"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleForgotSubmit()}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleForgotSubmit}
                  disabled={forgotLoading}
                >
                  {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {forgotLoading ? "전송 중..." : "임시 비밀번호 발급"}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                  <p className="font-medium text-blue-700">이메일이 전송되었습니다</p>
                  <p className="mt-2 text-sm text-blue-600">
                    <strong>{forgotEmail}</strong>
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    이메일에 포함된 임시 비밀번호로 로그인 후<br />
                    반드시 비밀번호를 변경해주세요.
                  </p>
                </div>
                <Button className="w-full" onClick={handleBackToLogin}>
                  로그인하러 가기
                </Button>
              </div>
            )}

            <button
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowForgot(false);
                setForgotSent(false);
                setForgotEmail("");
                setForgotError("");
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              로그인으로 돌아가기
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 pb-24">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">로그인</CardTitle>
          <CardDescription>Humend HR에 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="animate-in slide-in-from-top-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="010-1234-5678"
              className="pl-10"
              value={phone}
              onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="숫자+영어 6자리 이상"
              className="pl-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onPointerDown={(e) => { e.preventDefault(); setShowPassword((v) => !v); }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button className="w-full" onClick={() => handleLogin()} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "로그인 중..." : "로그인"}
          </Button>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {googleLoading ? "연결 중..." : "구글로 로그인"}
          </Button>
          {isIOS && (
            <Button
              variant="outline"
              className="w-full bg-black text-white hover:bg-gray-900 hover:text-white"
              onClick={handleAppleLogin}
              disabled={appleLoading}
            >
              {appleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              {appleLoading ? "연결 중..." : "Apple로 로그인"}
            </Button>
          )}
          <div className="flex items-center justify-between text-sm">
            <button
              className="text-muted-foreground hover:text-primary hover:underline"
              onClick={() => setShowForgot(true)}
            >
              비밀번호 찾기
            </button>
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              회원가입
            </Link>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

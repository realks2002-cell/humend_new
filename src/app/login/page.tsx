"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, Lock, Mail, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { memberLogin, resetPasswordByEmail } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/capacitor/native";

function formatPhoneDisplay(value: string): string {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
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

  const rawPhone = phone.replace(/\D/g, "");

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    const redirectTo = isNative()
      ? "com.humend.hr://auth/callback"
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      toast.error("구글 로그인 실패", { description: error.message });
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!rawPhone || !password) {
      setError("전화번호와 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("phone", rawPhone);
    formData.set("password", password);

    const result = await memberLogin(formData);
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
    <div className="flex min-h-[70vh] items-center justify-center px-4">
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
              onClick={() => setShowPassword((v) => !v)}
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

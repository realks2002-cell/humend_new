"use client";

import { useCallback, useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Lock, KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { memberLogin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { nativeGoogleSignIn } from "@/lib/google-auth";
import { cn } from "@/lib/utils";

const KAKAO_CHAT_URL = "https://pf.kakao.com/_sPCKb/chat";
const FETCH_TIMEOUT_MS = 15_000;

type VerifyStep = "idle" | "sent" | "verified";
type Hint = { text: string; error: boolean };
type PhoneHint = Hint & { kind?: "not_registered" | "kakao" };
type ApiData = {
  success?: boolean;
  error?: string;
  code?: string;
  requestId?: string;
  expiresIn?: number;
  resendAfter?: number;
  retryAfter?: number;
  verificationId?: string;
  validFor?: number;
};

function formatPhoneDisplay(value: string): string {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

function formatTimer(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function postJson(url: string, body: Record<string, string>): Promise<{ status: number; data: ApiData | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data: ApiData | null = null;
    try {
      const json: unknown = await res.json();
      if (json && typeof json === "object") data = json as ApiData;
    } catch {}
    return { status: res.status, data };
  } catch {
    return { status: controller.signal.aborted ? 408 : 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function KakaoLink({ children }: { children: ReactNode }) {
  return (
    <a href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  );
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
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (errorParam === "deleted") {
      toast.error("삭제된 계정입니다", { description: "관리자에게 문의해주세요." });
    }
  }, [errorParam]);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [showForgot, setShowForgot] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

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

        // members 테이블 확인 + fetch로 쿠키 설정
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();

        if (user && session) {
          const { data: member } = await supabase
            .from("members")
            .select("id, status")
            .eq("id", user.id)
            .maybeSingle();

          if (member && member.status !== "active") {
            await supabase.auth.signOut();
            toast.error("삭제된 계정입니다", { description: "관리자에게 문의해주세요." });
            setGoogleLoading(false);
            return;
          }

          const targetPath = member ? redirectPath : "/signup/complete";

          // fetch()로 쿠키 설정 후 클라이언트에서 네비게이션
          // form.submit()은 Capacitor WebView에서 시스템 브라우저를 여는 문제가 있음
          const res = await fetch("/api/auth/set-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          });
          if (res.ok) {
            window.location.href = targetPath;
          }
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

  // 비밀번호 찾기 화면
  if (showForgot) {
    return <PasswordReset onBack={() => setShowForgot(false)} />;
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

function PasswordReset({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [verifyStep, setVerifyStep] = useState<VerifyStep>("idle");
  const [sentPhone, setSentPhone] = useState("");
  const [requestId, setRequestId] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendPhone, setResendPhone] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [needsResend, setNeedsResend] = useState(false);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState<Hint | null>(null);
  const [phoneHint, setPhoneHint] = useState<PhoneHint | null>(null);
  const [verifiedUntil, setVerifiedUntil] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [now, setNow] = useState(0);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);

  const rawPhone = phone.replace(/\D/g, "");
  const isVerified = verifyStep === "verified";
  const isSentForCurrent = verifyStep === "sent" && rawPhone === sentPhone;
  const cooldownLeft = rawPhone === resendPhone ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0;
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const expired = isSentForCurrent && remaining === 0;
  const busy = sending || verifying || loading;
  const ticking = (verifyStep === "sent" && remaining > 0 && !needsResend) || cooldownLeft > 0;

  const resetVerification = useCallback(() => {
    setVerifyStep("idle");
    setSentPhone("");
    setRequestId("");
    setExpiresAt(0);
    setVerifiedUntil(0);
    setNeedsResend(false);
    setPending(false);
    setResent(false);
    setCode("");
    setCodeHint(null);
  }, []);

  const expireVerification = useCallback(() => {
    resetVerification();
    setPhoneHint({ text: "인증 시간이 지났어요. 다시 인증해 주세요.", error: true });
  }, [resetVerification]);

  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ticking]);

  useEffect(() => {
    if (verifyStep === "sent") codeInputRef.current?.focus();
  }, [requestId, verifyStep]);

  useEffect(() => {
    if (verifyStep !== "verified") return;
    const t = setTimeout(() => {
      if (inFlightRef.current) return;
      expireVerification();
    }, Math.max(0, verifiedUntil - Date.now()));
    return () => clearTimeout(t);
  }, [verifyStep, verifiedUntil, expireVerification]);

  const handleSend = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSending(true);
    const reqPhone = rawPhone;
    const hadSent = verifyStep === "sent" && sentPhone === reqPhone;

    try {
      const { status, data } = await postJson("/api/phone-verification/send", { phone: reqPhone, purpose: "reset" });
      const t = Date.now();
      setNow(t);

      if (status === 0) {
        setPhoneHint({ text: "네트워크 오류가 발생했어요. 다시 시도해 주세요.", error: true });
        return;
      }
      if (!data) {
        setPhoneHint({ text: "응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.", error: true });
        setResendPhone(reqPhone);
        setResendAt(t + 60_000);
        return;
      }
      if ((status === 200 || status === 202) && data.requestId) {
        setVerifyStep("sent");
        setSentPhone(reqPhone);
        setRequestId(data.requestId);
        setExpiresAt(t + (data.expiresIn ?? 0) * 1000);
        setResendPhone(reqPhone);
        setResendAt(t + (data.resendAfter ?? 60) * 1000);
        setCode("");
        setCodeHint(null);
        setNeedsResend(false);
        setPending(status === 202);
        setResent(hadSent);
        setPhoneHint(null);
        return;
      }
      if (status === 429 && data.code === "cooldown") {
        setResendPhone(reqPhone);
        setResendAt(t + (data.retryAfter ?? 60) * 1000);
        setPhoneHint({ text: data.error ?? "잠시 후 다시 요청해 주세요.", error: true });
        return;
      }
      if (status === 404 && data.code === "not_registered") {
        setPhoneHint({ text: "가입되지 않은 번호예요.", error: true, kind: "not_registered" });
        return;
      }
      if (
        (status === 400 && data.code === "sms_undeliverable") ||
        (status === 503 && data.code === "sms_unavailable")
      ) {
        if (typeof data.resendAfter === "number") {
          setResendPhone(reqPhone);
          setResendAt(t + data.resendAfter * 1000);
        }
        setPhoneHint({ text: data.error ?? "잠시 후 다시 시도해 주세요.", error: true, kind: "kakao" });
        return;
      }
      if ((status === 503 && data.code === "global_limit") || (status === 429 && data.code === "ip_limit")) {
        setPhoneHint({ text: data.error ?? "잠시 후 다시 시도해 주세요.", error: true, kind: "kakao" });
        return;
      }
      setPhoneHint({ text: data.error ?? "잠시 후 다시 시도해 주세요.", error: true });
    } finally {
      inFlightRef.current = false;
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (inFlightRef.current || code.length !== 6 || expired || needsResend) return;
    inFlightRef.current = true;
    setVerifying(true);

    try {
      const { status, data } = await postJson("/api/phone-verification/verify", {
        requestId,
        phone: sentPhone,
        code,
      });
      const t = Date.now();
      setNow(t);

      if (status === 200 && data?.verificationId) {
        setVerifyStep("verified");
        setRequestId(data.verificationId);
        setVerifiedUntil(t + (data.validFor ?? 0) * 1000);
        setCode("");
        setCodeHint(null);
        setNeedsResend(false);
        setPending(false);
        setPhoneHint(null);
        return;
      }
      if (status === 0 || !data || (status === 409 && data.code === "conflict")) {
        setCodeHint({ text: "잠시 후 다시 시도해 주세요", error: true });
        return;
      }
      if (status === 400 && data.code === "mismatch") {
        setCodeHint({ text: data.error ?? "인증번호가 일치하지 않아요.", error: true });
        return;
      }
      if (
        (status === 429 && data.code === "too_many_attempts") ||
        (status === 410 && data.code === "expired") ||
        (status === 400 && data.code === "not_requested")
      ) {
        setNeedsResend(true);
        setCodeHint({ text: data.error ?? "인증번호를 다시 받아 주세요.", error: true });
        if (data.code === "expired") setExpiresAt(t);
        return;
      }
      setCodeHint({ text: data.error ?? "잠시 후 다시 시도해 주세요", error: true });
    } finally {
      inFlightRef.current = false;
      setVerifying(false);
    }
  };

  const handleChangePhone = () => {
    resetVerification();
    setPhoneHint(null);
    setError("");
    phoneInputRef.current?.focus();
  };

  const handleReset = async () => {
    if (inFlightRef.current) return;
    setError("");

    if (verifyStep !== "verified") {
      setError("전화번호 인증을 완료해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      setError("비밀번호는 6자리 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (Date.now() >= verifiedUntil) {
      expireVerification();
      setError("인증 시간이 지났어요. 다시 인증해 주세요.");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);

    let keepVerification = true;
    try {
      const { status, data } = await postJson("/api/auth/password-reset", {
        phone: sentPhone,
        verificationId: requestId,
        newPassword,
      });

      if (status === 200 && data?.success) {
        keepVerification = false;
        toast.success("비밀번호가 변경되었습니다!");
        setDone(true);
        return;
      }
      if (status === 0) {
        setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
        return;
      }
      if (!data) {
        setError("응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setError(data.error ?? "잠시 후 다시 시도해 주세요.");
      if (data.code === "verification_required") {
        keepVerification = false;
        resetVerification();
      } else if (data.code === "not_registered") {
        keepVerification = false;
        resetVerification();
        setPhoneHint({ text: "가입되지 않은 번호예요.", error: true, kind: "not_registered" });
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      if (keepVerification && Date.now() >= verifiedUntil) expireVerification();
    }
  };

  let phoneButtonLabel = "인증요청";
  let phoneButtonDisabled = rawPhone.length !== 11 || cooldownLeft > 0 || busy;
  if (isVerified) {
    phoneButtonLabel = "번호 변경";
    phoneButtonDisabled = busy;
  } else if (isSentForCurrent && !(expired || needsResend)) {
    phoneButtonDisabled = true;
  } else if (isSentForCurrent) {
    phoneButtonLabel = "재요청";
    phoneButtonDisabled = cooldownLeft > 0 || busy;
  }

  let codeHintView: Hint;
  if (expired) {
    codeHintView = { text: "인증 시간이 지났어요. 인증번호를 다시 받아 주세요", error: true };
  } else if (codeHint) {
    codeHintView = codeHint;
  } else if (pending) {
    codeHintView = { text: "문자 발송 확인이 늦어지고 있어요. 문자가 오면 입력해 주세요", error: false };
  } else if (resent) {
    codeHintView = { text: "가장 최근에 받은 인증번호를 입력해 주세요", error: false };
  } else {
    codeHintView = { text: "문자로 받은 인증번호를 입력해 주세요", error: false };
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <KeyRound className="h-6 w-6 text-orange-500" />
          </div>
          <CardTitle className="text-xl">비밀번호 찾기</CardTitle>
          <CardDescription>가입한 전화번호로 인증하고 새 비밀번호를 설정하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="animate-in slide-in-from-top-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {done ? (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                <p className="font-medium text-blue-700">비밀번호가 변경되었습니다</p>
                <p className="mt-3 text-xs text-muted-foreground">새 비밀번호로 로그인해 주세요.</p>
              </div>
              <Button className="w-full" onClick={onBack}>
                로그인하러 가기
              </Button>
            </div>
          ) : (
            <>
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={phoneInputRef}
                      id="phone"
                      type="tel"
                      placeholder="010-1234-5678"
                      className={cn("pl-10", isVerified && "bg-muted text-muted-foreground")}
                      value={phone}
                      readOnly={busy || isVerified}
                      aria-invalid={phoneHint?.kind === "not_registered" || undefined}
                      onChange={(e) => {
                        setPhone(formatPhoneDisplay(e.target.value));
                        setPhoneHint(null);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-24 shrink-0"
                    disabled={phoneButtonDisabled}
                    onClick={isVerified ? handleChangePhone : handleSend}
                    aria-label={sending ? "인증번호 요청 중" : undefined}
                  >
                    {sending ? <Loader2 className="animate-spin" /> : phoneButtonLabel}
                  </Button>
                </div>
                <div aria-live="polite">
                  {phoneHint && (
                    <p className={cn("mt-1 text-xs", phoneHint.error ? "text-destructive" : "text-muted-foreground")}>
                      {phoneHint.text}
                      {phoneHint.kind === "not_registered" && (
                        <>
                          {" "}
                          <Link href="/signup" className="underline">
                            회원가입하기
                          </Link>
                        </>
                      )}
                      {phoneHint.kind === "kakao" && (
                        <>
                          {" "}
                          <KakaoLink>카카오톡 상담하기</KakaoLink>
                        </>
                      )}
                    </p>
                  )}
                  {!isVerified && !isSentForCurrent && cooldownLeft > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{cooldownLeft}초 후 다시 요청할 수 있어요</p>
                  )}
                  {isVerified && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge className="bg-green-100 text-green-700">
                        <Check />
                        인증 완료
                      </Badge>
                      10분 안에 변경을 완료해 주세요
                    </div>
                  )}
                </div>
              </div>
              {isSentForCurrent && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        ref={codeInputRef}
                        id="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-label="인증번호"
                        placeholder="인증번호 6자리"
                        className="pl-10 pr-14 tracking-[0.3em] tabular-nums placeholder:tracking-normal"
                        value={code}
                        readOnly={expired || needsResend}
                        aria-invalid={codeHint?.error || undefined}
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                          if (codeHint?.error) setCodeHint(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums text-destructive">
                        {formatTimer(remaining)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      className="w-24 shrink-0"
                      disabled={code.length !== 6 || busy || expired || needsResend}
                      onClick={handleVerify}
                      aria-label={verifying ? "인증번호 확인 중" : undefined}
                    >
                      {verifying ? <Loader2 className="animate-spin" /> : "확인"}
                    </Button>
                  </div>
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <p
                      aria-live="polite"
                      className={cn("text-xs", codeHintView.error ? "text-destructive" : "text-muted-foreground")}
                    >
                      {codeHintView.text}
                    </p>
                    {(cooldownLeft > 0 || !(expired || needsResend)) && (
                      <button
                        type="button"
                        className="shrink-0 text-xs text-muted-foreground underline disabled:no-underline disabled:opacity-70"
                        disabled={cooldownLeft > 0 || busy}
                        onClick={handleSend}
                      >
                        {cooldownLeft > 0 ? `재전송 (${cooldownLeft}초)` : "재전송"}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">문자가 오지 않으면 스팸 차단 설정을 확인해 주세요</p>
                </div>
              )}
              {isVerified ? (
                <>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="새 비밀번호 (영문+숫자 6자리 이상)"
                      className="pl-10 pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="새 비밀번호 확인"
                        className="pl-10 pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleReset()}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="mt-1 text-xs text-destructive">비밀번호가 일치하지 않습니다</p>
                    )}
                  </div>
                  <Button className="w-full" onClick={handleReset} disabled={busy}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "변경 중..." : "비밀번호 변경"}
                  </Button>
                </>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  전화번호 인증을 완료하면 새 비밀번호를 설정할 수 있어요
                </p>
              )}
            </>
          )}

          <button
            className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            로그인으로 돌아가기
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

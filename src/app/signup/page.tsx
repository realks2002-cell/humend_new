"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, User, Phone, Lock, Eye, EyeOff, ExternalLink, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { memberSignup } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

const KAKAO_CHAT_URL = "https://pf.kakao.com/_sPCKb/chat";
const FETCH_TIMEOUT_MS = 15_000;

type VerifyStep = "idle" | "sent" | "verified";
type Hint = { text: string; error: boolean };
type PhoneHint = Hint & { kind?: "already_registered" | "kakao" };
type ApiData = {
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

export default function SignupPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [signupConflict, setSignupConflict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeLocation, setAgreeLocation] = useState(false);
  const [agreeNotification, setAgreeNotification] = useState(false);

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

  const allAgreed = agreeTerms && agreePrivacy && agreeLocation && agreeNotification;
  const handleAgreeAll = (checked: boolean) => {
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeLocation(checked);
    setAgreeNotification(checked);
  };

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
      const { status, data } = await postJson("/api/phone-verification/send", { phone: reqPhone });
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
      if (status === 409 && data.code === "already_registered") {
        setPhoneHint({ text: "이미 가입된 번호예요.", error: true, kind: "already_registered" });
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
    setSignupConflict(false);
    phoneInputRef.current?.focus();
  };

  const handleSignup = async () => {
    if (inFlightRef.current) return;
    setError("");
    setSignupConflict(false);

    if (!rawPhone || !name) {
      setError("전화번호와 이름을 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자리 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!allAgreed) {
      setError("필수 약관에 모두 동의해주세요.");
      return;
    }

    if (verifyStep !== "verified") {
      setError("전화번호 인증을 완료해주세요.");
      return;
    }

    if (Date.now() >= verifiedUntil) {
      expireVerification();
      setError("인증 시간이 지났어요. 다시 인증해 주세요.");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    const formData = new FormData();
    formData.set("phone", sentPhone);
    formData.set("name", name);
    formData.set("password", password);
    formData.set("verificationId", requestId);

    let keepVerification = true;
    try {
      const result = await memberSignup(formData);

      if (result.error) {
        setError(result.error);
        toast.error("가입 실패", { description: result.error });
        if (result.code === "verification_required") {
          keepVerification = false;
          resetVerification();
        } else if (result.code === "already_registered") {
          keepVerification = false;
          resetVerification();
          setPhoneHint({ text: "이미 가입된 번호예요.", error: true, kind: "already_registered" });
        } else if (result.code === "auth_conflict") {
          setSignupConflict(true);
        }
        return;
      }

      keepVerification = false;
      toast.success("가입이 완료되었습니다!");
      setDone(true);
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
      toast.error("가입 실패", { description: "네트워크 오류가 발생했어요. 다시 시도해 주세요." });
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

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-20">
        <Card className="w-full max-w-sm text-center shadow-lg">
          <CardContent className="pt-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-xl font-bold">가입 완료!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Humend HR에 오신 것을 환영합니다.
              <br />
              회원정보를 등록하면 바로 지원할 수 있어요.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/my/resume">
                <Button className="w-full">회원정보 등록하기</Button>
              </Link>
              <Link href="/jobs">
                <Button variant="ghost" className="w-full">
                  일자리 보기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-20">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">회원가입</CardTitle>
          <CardDescription>전화번호와 비밀번호로 간편하게 가입하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="animate-in slide-in-from-top-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
              {signupConflict && (
                <p className="mt-1 text-xs">
                  예전에 가입을 시도했다면 그때 비밀번호로 다시 시도하거나{" "}
                  <KakaoLink>카카오톡 상담</KakaoLink>으로 문의해 주세요
                </p>
              )}
            </div>
          )}
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="반드시 실명으로 입력"
              className="pl-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
                  aria-invalid={phoneHint?.kind === "already_registered" || undefined}
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
                  {phoneHint.kind === "already_registered" && (
                    <>
                      {" "}
                      <Link href="/login" className="underline">
                        로그인하러 가기
                      </Link>
                      <br />
                      본인이 가입한 적이 없다면 <KakaoLink>카카오톡 상담</KakaoLink>으로 문의해 주세요
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
                  10분 안에 가입을 완료해 주세요
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
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="영문+숫자 6자리 이상"
              className="pl-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                id="confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="비밀번호 확인"
                className="pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignup()}
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
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-destructive">비밀번호가 일치하지 않습니다</p>
            )}
          </div>
          {/* 동의 체크박스 */}
          <div className="rounded-lg border p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={allAgreed}
                onCheckedChange={(v) => handleAgreeAll(v === true)}
              />
              <span className="text-sm font-semibold">전체 동의</span>
            </label>
            <div className="border-t" />
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={agreeTerms}
                onCheckedChange={(v) => setAgreeTerms(v === true)}
              />
              <span className="text-xs text-muted-foreground flex-1">[필수] 이용약관 동의</span>
              <a href="/terms" target="_blank" className="text-xs text-blue-500">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={agreePrivacy}
                onCheckedChange={(v) => setAgreePrivacy(v === true)}
              />
              <span className="text-xs text-muted-foreground flex-1">[필수] 개인정보 처리방침 동의</span>
              <a href="/privacy" target="_blank" className="text-xs text-blue-500">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={agreeLocation}
                onCheckedChange={(v) => setAgreeLocation(v === true)}
              />
              <span className="text-xs text-muted-foreground flex-1">[필수] 위치정보 수집·이용 동의</span>
            </label>
            <p className="text-[10px] text-muted-foreground/70 pl-6">
              출근 확인을 위해 근무지 접근 시 위치를 확인합니다. 위치는 지속적으로 수집되지 않으며, 90일 후 자동 삭제됩니다.
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={agreeNotification}
                onCheckedChange={(v: boolean | "indeterminate") => setAgreeNotification(v === true)}
              />
              <span className="text-xs text-muted-foreground flex-1">[필수] 알림 수신 동의</span>
            </label>
            <p className="text-[10px] text-muted-foreground/70 pl-6">
              근무 배정, 출근 안내, 급여 확정 등 주요 알림을 푸시로 받습니다.
            </p>
          </div>

          <div>
            <Button className="w-full" onClick={handleSignup} disabled={loading || !allAgreed || !isVerified}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "가입 중..." : "가입하기"}
            </Button>
            {!isVerified && (
              <p className="mt-2 text-center text-xs text-muted-foreground">전화번호 인증을 완료하면 가입할 수 있어요</p>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

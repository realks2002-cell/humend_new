"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Phone, Lock, Mail, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { memberLogin, resetPasswordByEmail } from "@/lib/supabase/auth";

function formatPhoneDisplay(value: string): string {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

export default function LoginPage() {
  const router = useRouter();
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
  const [tempPassword, setTempPassword] = useState("");

  // 임시 비밀번호 로그인 추적
  const [isTempLogin, setIsTempLogin] = useState(false);

  // 비밀번호 재설정 모달
  const [showResetModal, setShowResetModal] = useState(false);

  const rawPhone = phone.replace(/\D/g, "");

  const handleLogin = async (isTempLogin = false) => {
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

    if (isTempLogin) {
      // 임시 비밀번호로 로그인한 경우 재설정 모달 표시
      setShowResetModal(true);
    } else {
      router.push("/my");
      router.refresh();
    }
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

    setTempPassword(result.tempPassword ?? "");
    setForgotSent(true);
  };

  const handleBackToLogin = () => {
    setPassword(tempPassword);
    setShowForgot(false);
    setForgotSent(false);
    setForgotEmail("");
    setForgotError("");
    setTempPassword("");
    setIsTempLogin(true);
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
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-5 text-center">
                  <KeyRound className="mx-auto mb-2 h-8 w-8 text-green-600" />
                  <p className="font-medium text-green-700">임시 비밀번호가 발급되었습니다</p>
                  <p className="mt-3 text-3xl font-bold tracking-[0.3em] text-green-800">
                    {tempPassword}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    이 비밀번호로 로그인 후 반드시 비밀번호를 변경해주세요.
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
              onKeyDown={(e) => e.key === "Enter" && handleLogin(isTempLogin)}
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
          <Button className="w-full" onClick={() => handleLogin(isTempLogin)} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "로그인 중..." : "로그인"}
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

      {/* 비밀번호 재설정 안내 모달 */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-orange-500" />
              비밀번호를 재설정하세요
            </DialogTitle>
            <DialogDescription>
              임시 비밀번호로 로그인되었습니다.
              회원정보 페이지에서 비밀번호를 변경해주세요.
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full"
            onClick={() => {
              setShowResetModal(false);
              router.push("/my/resume");
              router.refresh();
            }}
          >
            회원정보로 이동
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

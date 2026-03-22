"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2, User, Phone, Lock, Eye, EyeOff, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";
import { memberSignup, memberLogin } from "@/lib/native-api/auth";
import { isNative } from "@/lib/capacitor/native";
import { updateMemberLocationConsent } from "@/lib/native-api/location-actions";

function formatPhoneDisplay(value: string): string {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

export default function SignupPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [locationStep, setLocationStep] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const rawPhone = phone.replace(/\D/g, "");

  const handleSignup = async () => {
    setError("");

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

    setLoading(true);
    const result = await memberSignup(rawPhone, name, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      toast.error("가입 실패", { description: result.error });
      return;
    }

    toast.success("가입이 완료되었습니다!");
    setDone(true);
    if (isNative()) {
      setLocationStep(true);
    }
  };

  const handleLocationConsent = async () => {
    setRequestingLocation(true);
    try {
      const { requestLocationPermission } = await import("@/lib/capacitor/geolocation");
      const granted = await requestLocationPermission();
      setLocationGranted(granted);
      if (granted) {
        // 가입 직후 세션이 없으므로 자동 로그인 후 동의 저장
        await memberLogin(rawPhone, password);
        await updateMemberLocationConsent(true);
        toast.success("위치 권한이 허용되었습니다.");
        setLocationStep(false);
      } else {
        toast.error("위치 권한이 거부되었습니다. 다시 시도해주세요.");
      }
    } catch {
      toast.error("위치 권한 요청 중 오류가 발생했습니다.");
    } finally {
      setRequestingLocation(false);
    }
  };

  if (done && locationStep) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="pt-8 space-y-4">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <MapPin className="h-10 w-10 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-center">위치정보 수집 동의</h2>
            <div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <p>출근 확인을 위해 <strong>배정된 근무일의 출근 2시간 전부터 도착 확인까지만</strong> 위치를 수집합니다.</p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <p>근무지 도착이 확인되면 <strong>위치 추적이 즉시 종료</strong>됩니다.</p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <p>수집된 위치 정보는 <strong>90일 후 자동 삭제</strong>됩니다.</p>
              </div>
            </div>
            <Button
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
              onClick={handleLocationConsent}
              disabled={requestingLocation}
            >
              {requestingLocation ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <MapPin className="h-5 w-5 mr-2" />
              )}
              {requestingLocation ? "권한 요청 중..." : "동의하고 위치 권한 허용하기"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              근태관리 및 출근길 안내를 위해 필요합니다
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
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
            {locationGranted && (
              <p className="mt-2 text-xs text-blue-600">
                위치 권한이 허용되었습니다. 출근 시 자동으로 위치가 공유됩니다.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/my/resume">
                <Button className="w-full">회원정보 등록하기</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  홈으로
                </Button>
              </Link>
            </div>
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
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">회원가입</CardTitle>
          <CardDescription>전화번호와 비밀번호로 간편하게 가입하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="animate-in slide-in-from-top-1 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              className="pl-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
          <Button className="w-full" onClick={handleSignup} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "가입 중..." : "가입하기"}
          </Button>
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

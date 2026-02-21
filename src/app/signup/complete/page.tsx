"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, User, Phone, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createGoogleMember } from "@/lib/supabase/auth";
import Link from "next/link";

function formatPhoneDisplay(value: string): string {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

export default function SignupCompletePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 구글 프로필에서 이름 가져오기
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const googleName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "";
      setName(googleName);
      setChecking(false);
    });
  }, [router]);

  const rawPhone = phone.replace(/\D/g, "");

  const handleSubmit = async () => {
    setError("");

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!rawPhone || rawPhone.length < 10) {
      setError("올바른 전화번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("phone", rawPhone);
    formData.set("name", name.trim());

    const result = await createGoogleMember(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      toast.error("가입 실패", { description: result.error });
      return;
    }

    toast.success("가입이 완료되었습니다!");
    setDone(true);
  };

  if (checking) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <CardTitle className="text-xl">추가 정보 입력</CardTitle>
          <CardDescription>
            서비스 이용을 위해 전화번호를 입력해주세요
          </CardDescription>
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
              type="tel"
              placeholder="010-1234-5678"
              className="pl-10"
              value={phone}
              onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "가입 중..." : "가입 완료"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

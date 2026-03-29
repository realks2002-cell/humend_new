"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, Link2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function formatPhoneDisplay(value: string): string {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

export default function GoogleLinkPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setChecking(false);
    });
  }, [router]);

  const rawPhone = phone.replace(/\D/g, "");

  const handleSubmit = async () => {
    setError("");
    if (!rawPhone || rawPhone.length < 10) {
      setError("올바른 전화번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("인증 정보가 없습니다. 다시 로그인해주세요.");
        setLoading(false);
        return;
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
      const res = await fetch(`${API_BASE}/api/native/auth/link-google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phone: rawPhone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "연결에 실패했습니다.");
        setLoading(false);
        return;
      }

      toast.success("구글 계정이 연결되었습니다!");
      router.push("/my");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checking) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-end justify-center pb-8 pt-24 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Link2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">구글 계정 연결</CardTitle>
          <CardDescription>
            회원가입 시 등록한 전화번호를 입력하세요
          </CardDescription>
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
            {loading ? "연결 중..." : "계정 연결"}
          </Button>
          <button
            className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            로그인으로 돌아가기
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, Loader2 } from "lucide-react";
import { adminLogin } from "@/lib/supabase/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!adminId || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("adminId", adminId);
    formData.set("password", password);

    const result = await adminLogin(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm overflow-hidden py-0">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">관리자 로그인</h1>
          <p className="mt-1 text-sm text-white/70">Humend HR 관리자 전용</p>
        </div>
        <CardContent className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-600 border border-red-200/50">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">아이디</label>
            <Input
              type="text"
              placeholder="관리자 아이디"
              className="rounded-xl"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">비밀번호</label>
            <Input
              type="password"
              placeholder="비밀번호 입력"
              className="rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <Button
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 font-semibold shadow-lg shadow-blue-500/20"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              "관리자 로그인"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

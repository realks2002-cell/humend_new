'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Info, LogOut, ChevronRight, Shield, MapPin } from "lucide-react";

export default function MorePage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-lg font-bold">더보기</h1>

      <div className="divide-y rounded-lg border bg-card">
        <Link
          href="/about"
          className="flex items-center justify-between px-4 py-3.5 transition-colors active:bg-muted"
        >
          <span className="flex items-center gap-3 text-sm">
            <Info className="h-4 w-4 text-muted-foreground" />
            사업소개
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          href="/privacy"
          className="flex items-center justify-between px-4 py-3.5 transition-colors active:bg-muted"
        >
          <span className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            개인정보처리방침
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          href="/my/location-consent"
          className="flex items-center justify-between px-4 py-3.5 transition-colors active:bg-muted"
        >
          <span className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            위치정보 수집 동의
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {!loading && user && (
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors active:bg-muted"
          >
            <span className="flex items-center gap-3 text-sm text-red-600">
              <LogOut className="h-4 w-4" />
              로그아웃
            </span>
          </button>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Humend HR v1.0.0
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * 미들웨어 대체: 클라이언트 사이드 인증 가드
 * 인증되지 않은 사용자를 /login으로 리다이렉트
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      // 고아 유저 체크: auth에 있지만 members에 없으면 추가정보 입력으로
      const { data: memberById } = await supabase
        .from("members")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!memberById) {
        // google_uid 또는 apple_uid로 매칭 시도
        const { data: memberByUid } = await supabase
          .from("members")
          .select("id")
          .or(`google_uid.eq.${user.id},apple_uid.eq.${user.id}`)
          .maybeSingle();

        if (!memberByUid) {
          router.replace("/signup/complete");
          return;
        }
      }

      setChecked(true);
    });
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

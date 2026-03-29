"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck, ShieldOff, Clock, Database, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LocationConsentPage() {
  const router = useRouter();
  const [consented, setConsented] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const { data: member } = await supabase
        .from("members")
        .select("location_consent")
        .eq("id", data.user.id)
        .single();
      setConsented((member as unknown as { location_consent?: boolean })?.location_consent ?? true);
      setLoading(false);
    });
  }, [router]);

  const handleToggle = async () => {
    const next = !consented;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!next) {
      const ok = confirm(
        "위치정보 수집 동의를 철회하면 지오펜싱 출석체크가 동작하지 않습니다. 철회하시겠습니까?"
      );
      if (!ok) return;
    }

    const { error } = await supabase
      .from("members")
      .update({ location_consent: next } as never)
      .eq("id", user.id);

    if (error) {
      toast.error("변경에 실패했습니다.");
      return;
    }

    setConsented(next);
    toast.success(next ? "위치정보 수집에 동의했습니다." : "위치정보 수집 동의를 철회했습니다.");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 pb-32">
      <h1 className="text-xl font-bold mb-6">위치정보 수집·이용 동의</h1>

      {/* 동의 상태 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            {consented ? (
              <ShieldCheck className="h-8 w-8 text-green-600" />
            ) : (
              <ShieldOff className="h-8 w-8 text-red-500" />
            )}
            <div>
              <p className="font-semibold text-lg">
                {consented ? "동의함" : "동의 철회됨"}
              </p>
              <p className="text-sm text-muted-foreground">
                {consented
                  ? "출근 확인을 위한 위치정보 수집이 활성화되어 있습니다."
                  : "위치정보 수집이 비활성화되어 출석체크가 동작하지 않습니다."}
              </p>
            </div>
          </div>
          <Button
            variant={consented ? "outline" : "default"}
            className="w-full"
            onClick={handleToggle}
          >
            {consented ? "동의 철회" : "다시 동의하기"}
          </Button>
        </CardContent>
      </Card>

      {/* 수집 안내 */}
      <h2 className="font-semibold text-base mb-4">수집 안내</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">수집 목적</p>
            <p className="text-sm text-muted-foreground">
              출근 확인을 위해 근무지 접근 시에만 위치를 확인합니다. 위치는 지속적으로 수집되지 않습니다.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">수집 항목</p>
            <p className="text-sm text-muted-foreground">GPS 좌표, 수집 시점</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">보관 기간</p>
            <p className="text-sm text-muted-foreground">90일 후 자동 삭제</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">제3자 제공</p>
            <p className="text-sm text-muted-foreground">수집된 위치정보는 제3자에게 제공되지 않습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

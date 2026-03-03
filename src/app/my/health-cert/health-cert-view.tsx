"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { type Member } from "@/lib/supabase/queries";
import { deleteHealthCert } from "./actions";
import { toast } from "sonner";

interface HealthCertViewProps {
  profile: Member & { health_cert_date: string; health_cert_image_url: string };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function HealthCertView({ profile }: HealthCertViewProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("보건증을 삭제하고 다시 제출하시겠습니까?")) return;
    setDeleting(true);
    const result = await deleteHealthCert();
    setDeleting(false);
    if (result.error) {
      toast.error("삭제 실패", { description: result.error });
      return;
    }
    toast.success("보건증이 삭제되었습니다. 다시 제출해주세요.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* 제출 완료 배너 */}
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">보건증 제출 완료</p>
          <p className="text-xs text-emerald-600">
            진단일: {formatDate(profile.health_cert_date)}
          </p>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-center">보건증 제출</h1>

      <Card className="overflow-hidden py-0">
        <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
          ■ 보건증 정보
        </div>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center px-5 py-3">
              <span className="w-24 text-sm text-muted-foreground shrink-0">진단일</span>
              <span className="text-sm font-medium">{formatDate(profile.health_cert_date)}</span>
            </div>
          </div>
          <div className="p-5">
            <div className="rounded-lg border overflow-hidden bg-white">
              <img
                src={profile.health_cert_image_url}
                alt="보건증"
                className="w-full max-h-96 object-contain"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleDelete}
        disabled={deleting}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {deleting ? "처리중..." : "다시 제출"}
      </Button>
    </div>
  );
}

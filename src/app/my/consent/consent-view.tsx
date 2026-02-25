"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw, CheckCircle2 } from "lucide-react";
import { type ParentalConsent, type Member } from "@/lib/supabase/queries";
import { revokeConsent } from "./actions";
import { toast } from "sonner";

interface ConsentViewProps {
  consent: ParentalConsent;
  profile: Member;
}

function formatPhone(phone: string) {
  const raw = phone.replace(/\D/g, "");
  if (raw.length === 11) return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
  if (raw.length === 10) return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  return phone;
}

function formatBirthDate(date: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatConsentDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function ConsentView({ consent, profile }: ConsentViewProps) {
  const router = useRouter();
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    if (!confirm("동의서를 철회하고 다시 작성하시겠습니까?")) return;
    setRevoking(true);
    const result = await revokeConsent();
    setRevoking(false);
    if (result.error) {
      toast.error("철회 실패", { description: result.error });
      return;
    }
    toast.success("동의서가 철회되었습니다. 다시 작성해주세요.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* 제출 완료 배너 */}
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">동의서 제출 완료</p>
          <p className="text-xs text-emerald-600">
            {formatConsentDate(consent.consented_at)} 제출됨
          </p>
        </div>
      </div>

      {/* 인쇄 영역 */}
      <div id="consent-print-area">
        <h1 className="text-2xl font-bold tracking-tight text-center">
          친권자 (후견인) 동의서
        </h1>

        {/* 친권자 인적사항 */}
        <Card className="overflow-hidden py-0 mt-6">
          <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
            ■ 친권자 (후견인) 인적사항
          </div>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="flex items-center px-5 py-3">
                <span className="w-24 text-sm text-muted-foreground shrink-0">성 명</span>
                <span className="text-sm font-medium">{consent.guardian_name}</span>
              </div>
              <div className="flex items-center px-5 py-3">
                <span className="w-24 text-sm text-muted-foreground shrink-0">연 락 처</span>
                <span className="text-sm font-medium">{consent.guardian_phone}</span>
              </div>
              <div className="flex items-center px-5 py-3">
                <span className="w-24 text-sm text-muted-foreground shrink-0">관 계</span>
                <span className="text-sm font-medium">{consent.guardian_relationship}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 연소근로자 인적사항 */}
        <Card className="overflow-hidden py-0 mt-4">
          <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
            ■ 연소근로자 인적사항
          </div>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="flex items-center px-5 py-3">
                <span className="w-24 text-sm text-muted-foreground shrink-0">성 명</span>
                <span className="text-sm font-medium">{profile.name ?? "-"}</span>
              </div>
              <div className="flex items-center px-5 py-3">
                <span className="w-24 text-sm text-muted-foreground shrink-0">생년월일</span>
                <span className="text-sm font-medium">{formatBirthDate(profile.birth_date)}</span>
              </div>
              <div className="flex items-center px-5 py-3">
                <span className="w-24 text-sm text-muted-foreground shrink-0">연 락 처</span>
                <span className="text-sm font-medium">{formatPhone(profile.phone)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 동의 문구 */}
        <div className="rounded-lg border bg-slate-50 p-5 text-center mt-4">
          <p className="text-sm leading-relaxed">
            본인은 위 연소근로자 <strong className="text-base">{profile.name ?? "___"}</strong>가
            (주)휴멘드에서 제공하는 사업장에서 근로를 하는 것에 대하여 동의합니다.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {formatConsentDate(consent.consented_at)}
          </p>
        </div>

        {/* 서명 */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">보호자 성명:</span>
            <span className="text-sm">{consent.guardian_name}</span>
            <span className="ml-auto text-sm font-semibold">서명</span>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <img
              src={consent.signature_url}
              alt="친권자 서명"
              className="h-24 mx-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* 액션 버튼 (인쇄 시 숨김) */}
      <div className="flex gap-3 print:hidden">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 h-4 w-4" />
          인쇄하기
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleRevoke}
          disabled={revoking}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {revoking ? "처리중..." : "다시 작성"}
        </Button>
      </div>
    </div>
  );
}

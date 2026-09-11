"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Member, ParentalConsent } from "@/lib/supabase/queries";

interface ParentalConsentDialogProps {
  data: { consent: ParentalConsent; member: Member } | null;
  onOpenChange: (open: boolean) => void;
}

export function ParentalConsentDialog({ data, onOpenChange }: ParentalConsentDialogProps) {
  return (
    <Dialog open={!!data} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>친권자 (후견인) 동의서</DialogTitle>
        </DialogHeader>
        {data && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">■ 친권자 인적사항</h4>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">성명</span><span>{data.consent.guardian_name}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">연락처</span><span>{data.consent.guardian_phone}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">관계</span><span>{data.consent.guardian_relationship}</span></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">■ 연소근로자 인적사항</h4>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">성명</span><span>{data.member.name ?? "-"}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">생년월일</span><span>{data.member.birth_date ?? "-"}</span></div>
                <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">연락처</span><span>{data.member.phone}</span></div>
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-center text-sm">
              본인은 위 연소근로자 <strong>{data.member.name ?? "___"}</strong>가
              (주)휴멘드에이치알에서 제공하는 사업장에서 근로를 하는 것에 대하여 동의합니다.
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {new Date(data.consent.consented_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">친권자 서명</p>
              <div className="rounded-lg border bg-white p-2">
                <img src={data.consent.signature_url} alt="서명" className="h-20 mx-auto object-contain" />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Wallet } from "lucide-react";
import { MonthSelector } from "@/components/ui/month-selector";
import { getMyWorkRecords, getMyProfile } from "@/lib/supabase/queries";
import { formatDate, formatCurrency, formatAccount } from "@/lib/utils/format";
import { ContractModal } from "./contract-modal";
import { ContractViewModal } from "./contract-view-modal";
import { PayslipModal } from "./payslip-modal";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

const statusStyle: Record<string, string> = {
  "대기": "bg-amber-500/10 text-amber-700",
  "확정": "bg-emerald-500/10 text-emerald-700",
  "지급완료": "bg-blue-500/10 text-blue-700",
};

export default async function SalaryPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [allRecords, profile] = await Promise.all([
    getMyWorkRecords(currentMonth),
    getMyProfile(),
  ]);

  // 서명 안된 레코드 (급여 신청 전)
  const records = allRecords.filter((r) => !r.signature_url);
  // 서명 완료 + payment 없음 (급여 신청 완료, 관리자 처리 대기)
  const pendingRecords = allRecords.filter((r) => r.signature_url && !r.payments);

  const worker = {
    name: profile?.name ?? "",
    rrnFront: (profile as unknown as Record<string, unknown>)?.rrn_front as string ?? "",
    rrnBack: (profile as unknown as Record<string, unknown>)?.rrn_back as string ?? "",
    phone: profile?.phone ?? "",
    region: (profile as unknown as Record<string, unknown>)?.region as string ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">급여지급요청</h1>
      </div>

      {/* Account Info Card */}
      <Card className="relative overflow-hidden border-blue-200/80 py-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-background" />
        <CardContent className="relative p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">급여/비용 청구</h2>
              <p className="text-xs text-muted-foreground">급여/비용 청구 전 계좌 정보를 확인바랍니다.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-white/80 px-4 py-3 text-sm">
            <span className="flex items-center gap-3">
              <span className="font-semibold">{profile?.bank_name ?? "-"}</span>
              <span className="text-muted-foreground">{profile?.account_number ? formatAccount(profile.account_number) : "-"}</span>
              <span className="font-medium">{profile?.account_holder ?? profile?.name ?? "-"}</span>
            </span>
            <Link href="/my/resume">
              <Button size="sm" className="h-7 text-xs shrink-0 rounded-none bg-blue-600 text-white hover:bg-blue-700">
                수정
              </Button>
            </Link>
          </div>

          <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <ul className="space-y-0.5">
              <li>식사, 휴게시간은 무급(임금에서 제외)입니다.</li>
              <li>급여는 근무 다음주 월~수요일 19시까지 지급됩니다.</li>
              <li>급여요청은 반드시 본인 명의 계좌로 요청해 주세요.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <MonthSelector currentMonth={currentMonth} basePath="/my/salary" />

      {/* Records (급여신청하기) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">근무기록</h2>

        {records.length === 0 ? (
          <Card className="py-0">
            <CardContent className="py-12 text-center">
              <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">해당 월의 근무 내역이 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const p = r.payments;
              const displayStatus = p?.status ?? r.status;
              const signed = !!r.signature_url;

              return (
                <Card
                  key={r.id}
                  className={`overflow-hidden transition-all py-0 ${signed ? "border-emerald-200/80" : ""}`}
                >
                  {signed && <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />}
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{r.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.work_date)} {r.start_time.slice(0, 5)}~{r.end_time.slice(0, 5)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge className={`text-[10px] font-semibold border-0 ${statusStyle[displayStatus] ?? "bg-muted text-muted-foreground"}`}>
                          {displayStatus}
                        </Badge>
                        {signed && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] font-semibold border-0">
                            계약완료
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {signed && <ContractViewModal record={r} worker={worker} />}
                      {p ? (
                        <PayslipModal record={r} />
                      ) : signed ? null : (
                        <ContractModal record={r} worker={worker} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 급여 신청 완료 (대기 중) */}
      {pendingRecords.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            급여 신청 완료 <Badge className="ml-1 bg-amber-500/10 text-amber-700 text-[10px] font-semibold border-0">{pendingRecords.length}건 대기</Badge>
          </h2>
          <div className="space-y-3">
            {pendingRecords.map((r) => (
              <Card key={r.id} className="overflow-hidden transition-all py-0 border-amber-200/80">
                <div className="h-0.5 bg-gradient-to-r from-amber-400 to-orange-400" />
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.work_date)} {r.start_time.slice(0, 5)}~{r.end_time.slice(0, 5)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge className="text-[10px] font-semibold border-0 bg-amber-500/10 text-amber-700">
                        대기
                      </Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] font-semibold border-0">
                        계약완료
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ContractViewModal record={r} worker={worker} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

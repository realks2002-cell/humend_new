export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { getMyWorkRecords, getMyProfile } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { MonthSelector } from "./month-selector";
import { ContractViewModal } from "../salary/contract-view-modal";
import { PayslipModal } from "../salary/payslip-modal";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

const statusStyle: Record<string, string> = {
  "대기": "bg-amber-500/10 text-amber-700",
  "확정": "bg-emerald-500/10 text-emerald-700",
  "지급완료": "bg-blue-500/10 text-blue-700",
};

export default async function HistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [allRecords, profile] = await Promise.all([
    getMyWorkRecords(currentMonth),
    getMyProfile(),
  ]);

  // payments가 있는 레코드만 표시
  const records = allRecords.filter((r) => r.payments);

  // 서명 이미지 URL 가져오기
  const signatureUrls: Record<string, string> = {};
  const signed = records.filter((r) => r.signature_url);
  if (signed.length > 0) {
    const admin = createAdminClient();
    await Promise.all(
      signed.map(async (r) => {
        const { data } = await admin.storage
          .from("signatures")
          .createSignedUrl(r.signature_url!, 3600);
        if (data?.signedUrl) signatureUrls[r.id] = data.signedUrl;
      })
    );
  }

  const worker = {
    name: profile?.name ?? "",
    rrnFront: (profile as unknown as Record<string, unknown>)?.rrn_front as string ?? "",
    rrnBack: (profile as unknown as Record<string, unknown>)?.rrn_back as string ?? "",
    phone: profile?.phone ?? "",
    region: (profile as unknown as Record<string, unknown>)?.region as string ?? "",
  };

  const totalGross = records.reduce((s, r) => s + r.gross_pay, 0);
  const totalNet = records.reduce((s, r) => s + r.net_pay, 0);
  const totalHours = records.reduce((s, r) => s + r.work_hours + r.overtime_hours, 0);

  const statCards = [
    { label: "근무일수", value: `${records.length}`, suffix: "일", icon: Calendar, gradient: "from-blue-600 to-indigo-600", lightBg: "from-blue-50 to-indigo-50" },
    { label: "총 근무시간", value: totalHours.toFixed(1), suffix: "h", icon: Clock, gradient: "from-amber-500 to-orange-500", lightBg: "from-amber-50 to-orange-50" },
    { label: "실수령액", value: formatCurrency(totalNet), suffix: "", icon: TrendingUp, gradient: "from-emerald-600 to-teal-600", lightBg: "from-emerald-50 to-teal-50" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">근무내역</h1>
        <p className="mt-1 text-sm text-muted-foreground">월별 근무내역을 확인하세요.</p>
      </div>

      <MonthSelector currentMonth={currentMonth} basePath="/my/history" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-2xl border bg-card p-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.lightBg} opacity-40`} />
            <div className="relative">
              <div className={`inline-flex rounded-xl bg-gradient-to-br ${stat.gradient} p-2 shadow-sm`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {stat.value}{stat.suffix && <span className="text-sm font-medium text-muted-foreground ml-0.5">{stat.suffix}</span>}
              </p>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Records */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">근무 기록</h2>
        {records.length === 0 ? (
          <Card className="py-0">
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">해당 월의 근무내역이 없습니다.</p>
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
                      {signed && <ContractViewModal record={r} worker={worker} signatureUrl={signatureUrls[r.id] ?? null} />}
                      {p && <PayslipModal record={r} />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      {records.length > 0 && (
        <Card className="overflow-hidden border-slate-200 py-0">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-5 py-3 border-b">
            <h3 className="text-sm font-semibold">월 합계</h3>
          </div>
          <CardContent className="space-y-2 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">총 지급액</span>
              <span className="font-medium">{formatCurrency(totalGross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">공제합계</span>
              <span className="font-medium text-red-500">
                -{formatCurrency(totalGross - totalNet)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>실수령액</span>
              <span className="text-emerald-600">{formatCurrency(totalNet)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

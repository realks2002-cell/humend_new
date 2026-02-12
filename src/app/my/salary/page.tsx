import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { MonthSelector } from "@/components/ui/month-selector";
import { getMyWorkRecords, getMyProfile } from "@/lib/supabase/queries";
import { formatDate, formatCurrency, formatAccount } from "@/lib/utils/format";
import { ContractModal } from "./contract-modal";
import { ContractViewModal } from "./contract-view-modal";
import { PayslipModal } from "./payslip-modal";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

const statusStyle: Record<string, "secondary" | "default" | "destructive"> = {
  "대기": "secondary",
  "확정": "default",
  "지급완료": "default",
};

export default async function SalaryPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [records, profile] = await Promise.all([
    getMyWorkRecords(currentMonth),
    getMyProfile(),
  ]);

  const worker = {
    name: profile?.name ?? "",
    rrnFront: (profile as Record<string, unknown>)?.rrn_front as string ?? "",
    rrnBack: (profile as Record<string, unknown>)?.rrn_back as string ?? "",
    phone: profile?.phone ?? "",
    region: (profile as Record<string, unknown>)?.region as string ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/my" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        마이페이지
      </Link>
      <h1 className="text-2xl font-bold">급여지급요청</h1>

      {/* 급여/비용 청구 안내 */}
      <Card className="mt-4 border-blue-400 bg-blue-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">급여/비용 청구</CardTitle>
          <p className="text-xs text-muted-foreground">급여/비용 청구 전 계좌 정보를 확인바랍니다.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm">
            <span className="flex items-center gap-4">
              <span className="font-medium">{profile?.bank_name ?? "-"}</span>
              <span className="font-medium">{profile?.account_number ? formatAccount(profile.account_number) : "-"}</span>
              <span className="font-medium">{profile?.account_holder ?? profile?.name ?? "-"}</span>
            </span>
            <Link href="/my/resume">
              <Button size="sm" className="h-7 text-xs shrink-0 ml-2 bg-blue-600 text-white hover:bg-blue-700">
                수정
              </Button>
            </Link>
          </div>
          <div className="flex gap-2 rounded-lg border border-orange-200 bg-orange-50/50 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
            <ul className="space-y-0.5">
              <li>식사, 휴게시간은 무급(임금에서 제외)입니다.</li>
              <li>급여는 근무 다음주 월~수요일 19시까지 지급됩니다.</li>
              <li>급여요청은 반드시 본인 명의 계좌로 요청해 주세요.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <MonthSelector currentMonth={currentMonth} basePath="/my/salary" />
      </div>

      <h2 className="mt-6 text-lg font-semibold">근무기록</h2>

      {records.length === 0 ? (
        <Card className="mt-6 border-gray-400">
          <CardContent className="py-8 text-center text-muted-foreground">
            해당 월의 근무 내역이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 space-y-3">
          {records.map((r) => {
            const p = r.payments;
            const display = p ?? r;
            const displayStatus = p?.status ?? r.status;
            const signed = !!r.signature_url;

            return (
              <Card key={r.id} className={signed ? "border-green-400 bg-green-50/30" : "border-gray-400"}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium">{r.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.work_date)} {r.start_time.slice(0, 5)}~{r.end_time.slice(0, 5)}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant={statusStyle[displayStatus] ?? "secondary"} className={`text-[10px] ${statusStyle[displayStatus] === "default" ? "bg-green-600 hover:bg-green-600" : ""}`}>
                        {displayStatus}
                      </Badge>
                      {signed && (
                        <Badge className="bg-green-600 text-[10px] text-white hover:bg-green-600">
                          계약완료
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
  );
}

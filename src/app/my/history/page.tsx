export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { getMyWorkRecords } from "@/lib/supabase/queries";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { MonthSelector } from "./month-selector";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

const statusStyle: Record<string, "secondary" | "default" | "destructive"> = {
  "대기": "secondary",
  "확정": "default",
  "지급완료": "default",
};

export default async function HistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const records = await getMyWorkRecords(currentMonth);

  const totalGross = records.reduce((s, r) => s + r.gross_pay, 0);
  const totalNet = records.reduce((s, r) => s + r.net_pay, 0);
  const totalHours = records.reduce((s, r) => s + r.work_hours + r.overtime_hours, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/my" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        마이페이지
      </Link>
      <h1 className="text-2xl font-bold">근무내역</h1>
      <p className="mt-1 text-muted-foreground">월별 근무내역을 확인하세요.</p>

      <div className="mt-4">
        <MonthSelector currentMonth={currentMonth} basePath="/my/history" />
      </div>

      {/* 월 요약 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card className="border-gray-400">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{records.length}</p>
            <p className="text-xs text-muted-foreground">근무일수</p>
          </CardContent>
        </Card>
        <Card className="border-gray-400">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">총 근무시간</p>
          </CardContent>
        </Card>
        <Card className="border-gray-400">
          <CardContent className="pt-4 text-center">
            <p className="text-lg font-bold">{formatCurrency(totalNet)}</p>
            <p className="text-xs text-muted-foreground">실수령액</p>
          </CardContent>
        </Card>
      </div>

      {/* 근무 리스트 */}
      <div className="mt-6 space-y-3">
        {records.length === 0 ? (
          <Card className="border-gray-400">
            <CardContent className="py-8 text-center text-muted-foreground">
              해당 월의 근무내역이 없습니다.
            </CardContent>
          </Card>
        ) : (
          records.map((r) => (
            <Card key={r.id} className="border-gray-400">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">{r.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.work_date)} {r.start_time.slice(0, 5)}~{r.end_time.slice(0, 5)}
                    <span className="ml-2">{r.work_hours + r.overtime_hours}h</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(r.net_pay)}</p>
                  {r.status !== "대기" && (
                    <Badge variant={statusStyle[r.status] ?? "secondary"} className={`mt-1 ${statusStyle[r.status] === "default" ? "bg-green-600 hover:bg-green-600" : ""}`}>
                      {r.status}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {records.length > 0 && (
        <Card className="mt-4 border-gray-400">
          <CardHeader>
            <CardTitle className="text-sm">월 합계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">총 지급액</span>
              <span>{formatCurrency(totalGross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">공제합계</span>
              <span className="text-destructive">
                -{formatCurrency(totalGross - totalNet)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>실수령액</span>
              <span>{formatCurrency(totalNet)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

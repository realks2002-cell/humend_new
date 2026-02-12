export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonthSelector } from "@/components/ui/month-selector";
import { getAllWorkRecords, getWorkRecordStats } from "@/lib/supabase/queries";
import { formatCurrency } from "@/lib/utils/format";
import { PayrollTable } from "./payroll-table";
import { SheetsSync } from "./sheets-sync";

interface Props {
  searchParams: Promise<{ month?: string; status?: string }>;
}

export default async function PayrollPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [records, stats] = await Promise.all([
    getAllWorkRecords({ month: currentMonth, status: params.status, pendingOnly: true }),
    getWorkRecordStats(currentMonth, true),  // pendingOnly: 미처리 급여요청만
  ]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">급여 관리</h1>
          <div className="mt-2">
            <MonthSelector currentMonth={currentMonth} basePath="/admin/payroll" />
          </div>
        </div>
        <SheetsSync month={currentMonth} />
      </div>

      {/* 통계 - 인라인 */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className="gap-1 px-3 py-1">
          전체 <span className="font-bold">{stats.total}</span>
        </Badge>
        <Badge variant="secondary" className="gap-1 px-3 py-1">
          대기 <span className="font-bold text-orange-500">{stats.pending}</span>
        </Badge>
        <Badge variant="secondary" className="gap-1 px-3 py-1">
          확정 <span className="font-bold text-blue-500">{stats.confirmed}</span>
        </Badge>
        <Badge variant="secondary" className="gap-1 px-3 py-1">
          지급예정 <span className="font-bold">{formatCurrency(stats.totalNet)}</span>
        </Badge>
      </div>

      {/* 급여 테이블 */}
      <Card className="mt-4">
        <CardContent className="pt-4">
          <PayrollTable records={records} month={currentMonth} />
        </CardContent>
      </Card>
    </div>
  );
}

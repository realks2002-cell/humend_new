export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonthSelector } from "@/components/ui/month-selector";
import { getAllWorkRecords, getWorkRecordStats } from "@/lib/supabase/queries";
import { formatCurrency } from "@/lib/utils/format";
import { Wallet, Clock, CheckCircle2, TrendingUp } from "lucide-react";
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
    getWorkRecordStats(currentMonth, true),
  ]);

  const statCards = [
    { label: "전체", value: stats.total, icon: Wallet, gradient: "from-blue-600 to-indigo-600", lightBg: "from-blue-50 to-indigo-50" },
    { label: "대기", value: stats.pending, icon: Clock, gradient: "from-amber-500 to-orange-500", lightBg: "from-amber-50 to-orange-50" },
    { label: "확정", value: stats.confirmed, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-500", lightBg: "from-emerald-50 to-teal-50" },
    { label: "지급예정", value: formatCurrency(stats.totalNet), icon: TrendingUp, gradient: "from-violet-500 to-purple-500", lightBg: "from-violet-50 to-purple-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">급여 관리</h1>
          <div className="mt-3">
            <MonthSelector currentMonth={currentMonth} basePath="/admin/payroll" />
          </div>
        </div>
        <SheetsSync month={currentMonth} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-2xl border bg-card p-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.lightBg} opacity-40`} />
            <div className="relative">
              <div className={`inline-flex rounded-xl bg-gradient-to-br ${stat.gradient} p-2 shadow-sm`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs font-semibold text-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0 pt-4">
          <PayrollTable records={records} month={currentMonth} />
        </CardContent>
      </Card>
    </div>
  );
}

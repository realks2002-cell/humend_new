export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, Building2, CalendarCheck, Wallet, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { getAllApplications } from "@/lib/supabase/queries";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ApplicationPieChart, PayrollBarChart } from "./dashboard-charts";
import { CollapsibleSection } from "./collapsible-section";
import { getDashboardStats } from "./actions";
import { MonthSelector } from "@/components/ui/month-selector";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : defaultMonth;

  const [dashStats, applications] = await Promise.all([
    getDashboardStats(currentMonth),
    getAllApplications(),
  ]);

  const pendingApps = applications.filter((a) => a.status === "대기");
  const recentActivity = applications.slice(0, 8);

  const [selYear, selMonthNum] = currentMonth.split("-").map(Number);
  const barData = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(selYear, selMonthNum - 1 - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    barData.push({ label, amount: dashStats.monthlyPayroll[month] ?? 0 });
  }

  const payrollLabel = currentMonth === defaultMonth ? "이번 달 급여" : `${selMonthNum}월 급여`;

  const stats = [
    { label: "확정 근무", value: dashStats.workRecordCount, icon: CalendarCheck },
    { label: "미처리 지원", value: dashStats.pendingAppCount, icon: ClipboardList, warn: dashStats.pendingAppCount > 0 },
    { label: "등록 회원", value: dashStats.memberCount, icon: Users },
    { label: "제휴 고객사", value: dashStats.clientCount, icon: Building2 },
    { label: payrollLabel, value: formatCurrency(dashStats.totalNet), icon: Wallet, hasMonthSelector: true },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <CollapsibleSection label="카드">
        <div className="grid gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`grid content-start gap-1 bg-white p-5 ${"hasMonthSelector" in stat ? "sm:col-span-2 lg:col-span-1" : ""}`}
            >
              <div className="flex h-7 items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                  <stat.icon className="h-4 w-4 text-gray-400" />
                  {stat.label}
                </p>
                {"hasMonthSelector" in stat && stat.hasMonthSelector && (
                  <MonthSelector currentMonth={currentMonth} basePath="/admin" compact />
                )}
              </div>
              <p
                className={`text-3xl font-bold tracking-tight tabular-nums ${"warn" in stat && stat.warn ? "text-amber-700" : "text-gray-900"}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Charts Row */}
      <CollapsibleSection label="차트">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden py-0">
            <div className="bg-[#F2F7FF] px-5 py-3 border-b">
              <h3 className="text-sm font-semibold">지원 현황</h3>
            </div>
            <CardContent className="p-5">
              <ApplicationPieChart
                pending={dashStats.pendingAppCount}
                approved={dashStats.approvedAppCount}
                rejected={dashStats.rejectedAppCount}
              />
            </CardContent>
          </Card>
          <Card className="overflow-hidden py-0">
            <div className="bg-[#F2F7FF] px-5 py-3 border-b">
              <h3 className="text-sm font-semibold">월별 급여 추이</h3>
            </div>
            <CardContent className="p-5">
              <PayrollBarChart data={barData} />
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>

      {/* Pending Applications + Activity Timeline */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden py-0">
          <div className="flex items-center justify-between bg-[#F2F7FF] px-5 py-3 border-b">
            <h3 className="text-sm font-semibold">미처리 지원 목록</h3>
            {pendingApps.length > 0 && (
              <Link href="/admin/applications">
                <Button variant="ghost" size="sm" className="h-7 text-[13px]">
                  전체보기 <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
          <CardContent className="p-0">
            {pendingApps.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500/30" />
                <p className="text-sm text-muted-foreground">미처리 지원이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingApps.slice(0, 5).map((app) => (
                  <div key={app.id} className="px-5 py-3 transition-colors hover:bg-muted/30">
                    <p className="text-sm font-semibold truncate">{app.members?.name ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.job_postings.clients.company_name} · {formatDate(app.job_postings.work_date)}
                    </p>
                  </div>
                ))}
                {pendingApps.length > 5 && (
                  <p className="py-2.5 text-center text-xs text-muted-foreground">
                    외 {pendingApps.length - 5}건 더 있음
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card className="overflow-hidden py-0">
          <div className="bg-[#F2F7FF] px-5 py-3 border-b">
            <h3 className="text-sm font-semibold">최근 활동</h3>
          </div>
          <CardContent className="p-5">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">최근 활동이 없습니다</p>
              </div>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {recentActivity.map((app) => {
                  const statusColor =
                    app.status === "승인" ? "bg-emerald-500" :
                    app.status === "거절" ? "bg-red-500" :
                    "bg-amber-400";
                  return (
                    <div key={app.id} className="relative flex items-start gap-3 py-2.5">
                      <div className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusColor} ring-2 ring-background`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{app.members?.name ?? "회원"}</span>
                          {" "}님이{" "}
                          <span className="font-semibold">{app.job_postings.clients.company_name}</span>
                          {" "}에 지원
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(app.applied_at)}</span>
                          <Badge
                            className={`h-4 text-[10px] font-semibold border-0 ${
                              app.status === "승인" ? "bg-emerald-500/10 text-emerald-700" :
                              app.status === "거절" ? "bg-red-500/10 text-red-700" :
                              "bg-amber-500/10 text-amber-700"
                            }`}
                          >
                            {app.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

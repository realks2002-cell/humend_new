export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, Building2, CalendarCheck, Wallet, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { getAllMembers, getAllClients, getAllApplications, getApplicationCounts, getWorkRecordStats } from "@/lib/supabase/queries";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ApplicationPieChart, PayrollBarChart } from "./dashboard-charts";
import { PendingActions } from "./pending-actions";
import { CollapsibleSection } from "./collapsible-section";

export default async function AdminDashboard() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [members, clients, applications, counts, payrollStats] = await Promise.all([
    getAllMembers(),
    getAllClients(),
    getAllApplications(),
    getApplicationCounts(),
    getWorkRecordStats(currentMonth),
  ]);

  const pendingApps = applications.filter((a) => a.status === "대기");
  const approvedCount = applications.filter((a) => a.status === "승인").length;
  const rejectedCount = applications.filter((a) => a.status === "거절").length;

  const barData = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    barData.push({ label, amount: month === currentMonth ? payrollStats.totalNet : 0 });
  }

  const recentActivity = applications.slice(0, 8);

  const stats = [
    { label: "승인된 근무", value: approvedCount, icon: CalendarCheck, gradient: "from-blue-600 to-indigo-600", lightBg: "from-blue-50 to-indigo-50" },
    { label: "미처리 지원", value: counts.pending, icon: ClipboardList, gradient: "from-amber-500 to-orange-500", lightBg: "from-amber-50 to-orange-50" },
    { label: "등록 회원", value: members.length, icon: Users, gradient: "from-violet-500 to-purple-500", lightBg: "from-violet-50 to-purple-50" },
    { label: "제휴 고객사", value: clients.length, icon: Building2, gradient: "from-emerald-500 to-teal-500", lightBg: "from-emerald-50 to-teal-50" },
    { label: "이번 달 급여", value: formatCurrency(payrollStats.totalNet), icon: Wallet, gradient: "from-rose-500 to-pink-500", lightBg: "from-rose-50 to-pink-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">관리자 대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">오늘의 현황을 확인하세요.</p>
      </div>

      {/* Stat Cards */}
      <CollapsibleSection label="카드">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-300 hover:shadow-md">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.lightBg} opacity-40`} />
              <div className="relative">
                <div className={`inline-flex rounded-xl bg-gradient-to-br ${stat.gradient} p-2 shadow-sm`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Charts Row */}
      <CollapsibleSection label="차트">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden py-0">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50/50 px-5 py-3 border-b">
              <h3 className="text-sm font-semibold">지원 현황</h3>
            </div>
            <CardContent className="p-5">
              <ApplicationPieChart
                pending={counts.pending}
                approved={approvedCount}
                rejected={rejectedCount}
              />
            </CardContent>
          </Card>
          <Card className="overflow-hidden py-0">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50/50 px-5 py-3 border-b">
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
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50/50 px-5 py-3 border-b">
            <h3 className="text-sm font-semibold">미처리 지원 목록</h3>
            {pendingApps.length > 0 && (
              <Link href="/admin/applications">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
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
                  <div key={app.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{app.job_postings.clients.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(app.job_postings.work_date)} {app.job_postings.start_time.slice(0, 5)}~{app.job_postings.end_time.slice(0, 5)}
                        {app.members && <span className="ml-2 font-medium">| {app.members.name}</span>}
                      </p>
                    </div>
                    <PendingActions applicationId={app.id} />
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
          <div className="bg-gradient-to-r from-slate-50 to-gray-50/50 px-5 py-3 border-b">
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

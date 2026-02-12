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

  // Generate last 4 months data for bar chart
  const barData = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    barData.push({ label, amount: month === currentMonth ? payrollStats.totalNet : 0 });
  }

  // Recent activity (last 10 applications)
  const recentActivity = applications.slice(0, 8);

  const stats = [
    { label: "승인된 근무", value: approvedCount, icon: CalendarCheck, color: "bg-primary/10 text-primary" },
    { label: "미처리 지원", value: counts.pending, icon: ClipboardList, color: "bg-orange-500/10 text-orange-500" },
    { label: "등록 회원", value: members.length, icon: Users, color: "bg-blue-500/10 text-blue-500" },
    { label: "제휴 고객사", value: clients.length, icon: Building2, color: "bg-green-500/10 text-green-500" },
    { label: "이번 달 급여", value: formatCurrency(payrollStats.totalNet), icon: Wallet, color: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <div className="animate-in fade-in duration-500 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="mt-1 text-muted-foreground">오늘의 현황을 확인하세요.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="mt-6">
        <CollapsibleSection label="카드">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((stat) => (
              <Card key={stat.label} className="transition-all hover:shadow-md">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className={`rounded-xl p-2.5 ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* Charts Row */}
      <div className="mt-6">
        <CollapsibleSection label="차트">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">지원 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <ApplicationPieChart
                  pending={counts.pending}
                  approved={approvedCount}
                  rejected={rejectedCount}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">월별 급여 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <PayrollBarChart data={barData} />
              </CardContent>
            </Card>
          </div>
        </CollapsibleSection>
      </div>

      {/* Pending Applications + Activity Timeline */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Pending Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">미처리 지원 목록</CardTitle>
            {pendingApps.length > 0 && (
              <Link href="/admin/applications">
                <Button variant="ghost" size="sm">
                  전체보기 <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {pendingApps.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500/50" />
                <p className="text-sm text-muted-foreground">미처리 지원이 없습니다. 모두 처리 완료!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApps.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{app.job_postings.clients.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(app.job_postings.work_date)} {app.job_postings.start_time}~{app.job_postings.end_time}
                        {app.members && <span className="ml-2">| {app.members.name}</span>}
                      </p>
                    </div>
                    <PendingActions applicationId={app.id} />
                  </div>
                ))}
                {pendingApps.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground">
                    외 {pendingApps.length - 5}건 더 있음
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">최근 활동이 없습니다</p>
              </div>
            ) : (
              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {recentActivity.map((app, idx) => {
                  const statusColor =
                    app.status === "승인" ? "bg-green-500" :
                    app.status === "거절" ? "bg-red-500" :
                    "bg-orange-400";
                  return (
                    <div key={app.id} className="relative flex items-start gap-3 py-2.5">
                      <div className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusColor} ring-2 ring-background`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{app.members?.name ?? "회원"}</span>
                          {" "}님이{" "}
                          <span className="font-medium">{app.job_postings.clients.company_name}</span>
                          {" "}에 지원
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(app.applied_at)}</span>
                          <Badge
                            variant={app.status === "승인" ? "default" : app.status === "거절" ? "destructive" : "secondary"}
                            className="h-4 text-[10px]"
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

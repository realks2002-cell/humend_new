export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, CheckCircle2, XCircle } from "lucide-react";
import { getMyApplications } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils/format";
import type { Application } from "@/lib/supabase/queries";

const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "destructive"; color: string }> = {
  "대기": { label: "대기중", variant: "secondary", color: "bg-amber-500/10 text-amber-700" },
  "승인": { label: "승인", variant: "default", color: "bg-emerald-500/10 text-emerald-700" },
  "거절": { label: "거절", variant: "destructive", color: "bg-red-500/10 text-red-700" },
};

function ApplicationItem({ app }: { app: Application }) {
  const config = statusConfig[app.status] ?? statusConfig["대기"];
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{app.job_postings.clients.company_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(app.job_postings.work_date)} {app.job_postings.start_time.slice(0, 5)}~{app.job_postings.end_time.slice(0, 5)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          지원일: {new Date(app.applied_at).toLocaleDateString("ko-KR")}
        </p>
      </div>
      <Badge className={`shrink-0 text-[11px] font-semibold border-0 ${config.color}`}>
        {config.label}
      </Badge>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="py-12 text-center">
      <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message ?? "지원 내역이 없습니다."}</p>
    </div>
  );
}

export default async function ApplicationsPage() {
  const all = await getMyApplications();
  const pending = all.filter((a) => a.status === "대기");
  const approved = all.filter((a) => a.status === "승인");
  const rejected = all.filter((a) => a.status === "거절");

  const tabData = [
    { value: "all", label: "전체", count: all.length, icon: ClipboardList, items: all },
    { value: "pending", label: "대기중", count: pending.length, icon: Clock, items: pending },
    { value: "approved", label: "승인", count: approved.length, icon: CheckCircle2, items: approved },
    { value: "rejected", label: "거절", count: rejected.length, icon: XCircle, items: rejected },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">근무신청 조회</h1>
        <p className="mt-1 text-sm text-muted-foreground">내 지원 현황을 확인하세요.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50/30 p-4">
          <div className="inline-flex rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-2 shadow-sm">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <p className="mt-2 text-2xl font-bold">{pending.length}</p>
          <p className="text-xs font-medium text-muted-foreground">대기중</p>
        </div>
        <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50/30 p-4">
          <div className="inline-flex rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <p className="mt-2 text-2xl font-bold">{approved.length}</p>
          <p className="text-xs font-medium text-muted-foreground">승인됨</p>
        </div>
        <div className="rounded-2xl border bg-gradient-to-br from-red-50 to-rose-50/30 p-4">
          <div className="inline-flex rounded-xl bg-gradient-to-br from-red-500 to-rose-500 p-2 shadow-sm">
            <XCircle className="h-4 w-4 text-white" />
          </div>
          <p className="mt-2 text-2xl font-bold">{rejected.length}</p>
          <p className="text-xs font-medium text-muted-foreground">거절</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="w-full grid grid-cols-4">
          {tabData.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label} ({tab.count})
            </TabsTrigger>
          ))}
        </TabsList>
        {tabData.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <Card className="overflow-hidden py-0">
              <CardContent className="p-0 divide-y">
                {tab.items.length === 0 ? (
                  <EmptyState />
                ) : (
                  tab.items.map((app) => <ApplicationItem key={app.id} app={app} />)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyApplications } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils/format";
import type { Application } from "@/lib/supabase/queries";

const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  "대기": { label: "대기중", variant: "secondary" },
  "승인": { label: "승인", variant: "default" },
  "거절": { label: "거절", variant: "destructive" },
};

function ApplicationItem({ app }: { app: Application }) {
  const config = statusConfig[app.status] ?? statusConfig["대기"];
  return (
    <Card className="border-gray-400">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="font-medium">{app.job_postings.clients.company_name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(app.job_postings.work_date)} {app.job_postings.start_time}~{app.job_postings.end_time}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            지원일: {new Date(app.applied_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <Badge variant={config.variant} className={config.variant === "default" ? "bg-green-600 hover:bg-green-600" : ""}>{config.label}</Badge>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      지원 내역이 없습니다.
    </p>
  );
}

export default async function ApplicationsPage() {
  const all = await getMyApplications();
  const pending = all.filter((a) => a.status === "대기");
  const approved = all.filter((a) => a.status === "승인");
  const rejected = all.filter((a) => a.status === "거절");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">근무신청 조회</h1>
      <p className="mt-1 text-muted-foreground">내 지원 현황을 확인하세요.</p>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">전체 ({all.length})</TabsTrigger>
          <TabsTrigger value="pending">대기중 ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">승인 ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">거절 ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4 space-y-3">
          {all.length === 0 ? <EmptyState /> : all.map((app) => <ApplicationItem key={app.id} app={app} />)}
        </TabsContent>
        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? <EmptyState /> : pending.map((app) => <ApplicationItem key={app.id} app={app} />)}
        </TabsContent>
        <TabsContent value="approved" className="mt-4 space-y-3">
          {approved.length === 0 ? <EmptyState /> : approved.map((app) => <ApplicationItem key={app.id} app={app} />)}
        </TabsContent>
        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejected.length === 0 ? <EmptyState /> : rejected.map((app) => <ApplicationItem key={app.id} app={app} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

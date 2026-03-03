export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllApplications } from "@/lib/supabase/queries";
import type { Member } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { ApplicationTable } from "./application-table";

export default async function AdminApplicationsPage() {
  const all = await getAllApplications();

  // applications에서 member_id 추출 → 필요한 회원만 조회
  const memberIds = [...new Set(all.map((a) => a.member_id))];

  let membersMap: Record<string, Member> = {};
  if (memberIds.length > 0) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("members")
      .select("*")
      .in("id", memberIds);
    membersMap = Object.fromEntries((data ?? []).map((m: Member) => [m.id, m]));
  }

  const pending = all.filter((a) => a.status === "대기");
  const approved = all.filter((a) => a.status === "승인");
  const rejected = all.filter((a) => a.status === "거절");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">지원 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          지원자를 확인하고 승인/거절합니다.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">대기중 ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm">승인 ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm">거절 ({rejected.length})</TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">전체 ({all.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ApplicationTable apps={pending} showActions membersMap={membersMap} profileImageUrls={{}} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ApplicationTable apps={approved} showActions membersMap={membersMap} profileImageUrls={{}} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ApplicationTable apps={rejected} showActions membersMap={membersMap} profileImageUrls={{}} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ApplicationTable apps={all} showActions membersMap={membersMap} profileImageUrls={{}} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

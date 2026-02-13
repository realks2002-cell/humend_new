export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllApplications, getAllMembers } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { ApplicationTable } from "./application-table";

export default async function AdminApplicationsPage() {
  const [all, members] = await Promise.all([
    getAllApplications(),
    getAllMembers(),
  ]);

  const membersMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const profileImageUrls: Record<string, string> = {};
  const withImage = members.filter((m) => m.profile_image_url);
  if (withImage.length > 0) {
    const admin = createAdminClient();
    await Promise.all(
      withImage.map(async (m) => {
        const { data } = await admin.storage
          .from("profile-photos")
          .createSignedUrl(m.profile_image_url!, 3600);
        if (data?.signedUrl) profileImageUrls[m.id] = data.signedUrl;
      })
    );
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
              <ApplicationTable apps={pending} showActions membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ApplicationTable apps={approved} membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ApplicationTable apps={rejected} membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
              <ApplicationTable apps={all} showActions membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

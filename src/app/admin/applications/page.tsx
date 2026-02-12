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

  // 회원 맵 (member_id -> Member)
  const membersMap = Object.fromEntries(members.map((m) => [m.id, m]));

  // 프로필 사진 signed URL
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
    <div className="p-6">
      <h1 className="text-2xl font-bold">지원 관리</h1>
      <p className="mt-1 text-muted-foreground">
        지원자를 확인하고 승인/거절합니다.
      </p>

      <Tabs defaultValue="pending" className="mt-6">
        <TabsList>
          <TabsTrigger value="pending">대기중 ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">승인 ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">거절 ({rejected.length})</TabsTrigger>
          <TabsTrigger value="all">전체 ({all.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ApplicationTable apps={pending} showActions membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ApplicationTable apps={approved} membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ApplicationTable apps={rejected} membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ApplicationTable apps={all} showActions membersMap={membersMap} profileImageUrls={profileImageUrls} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

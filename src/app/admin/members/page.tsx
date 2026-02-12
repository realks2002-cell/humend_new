import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getAllMembers } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { MembersTable } from "./members-table";

export default async function AdminMembersPage() {
  const members = await getAllMembers();

  // 프로필 사진 signed URL 생성
  const profileImageUrls: Record<string, string> = {};
  const membersWithImage = members.filter((m) => m.profile_image_url);
  if (membersWithImage.length > 0) {
    const admin = createAdminClient();
    await Promise.all(
      membersWithImage.map(async (m) => {
        const { data } = await admin.storage
          .from("profile-photos")
          .createSignedUrl(m.profile_image_url!, 3600);
        if (data?.signedUrl) {
          profileImageUrls[m.id] = data.signedUrl;
        }
      })
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">회원 관리</h1>
          <p className="mt-1 text-muted-foreground">
            등록된 회원을 조회하고 관리합니다.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="이름 또는 전화번호 검색" className="pl-9" />
      </div>

      {/* Table */}
      <Card className="mt-4">
        <CardContent className="p-0">
          <MembersTable members={members} profileImageUrls={profileImageUrls} />
        </CardContent>
      </Card>
    </div>
  );
}

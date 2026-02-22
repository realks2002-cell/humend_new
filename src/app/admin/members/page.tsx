export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { getMembersPaginated } from "@/lib/supabase/queries";
import { MembersTable } from "./members-table";

const PAGE_SIZE = 50;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search ?? "";
  const { data: members, total } = await getMembersPaginated({ page, pageSize: PAGE_SIZE, search });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">회원 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등록된 회원을 조회하고 관리합니다.
          </p>
        </div>
        <Badge className="bg-violet-500/10 text-violet-700 border-0 font-semibold">
          <Users className="mr-1 h-3 w-3" />
          {total}명
        </Badge>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <MembersTable
            members={members}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            search={search}
          />
        </CardContent>
      </Card>
    </div>
  );
}

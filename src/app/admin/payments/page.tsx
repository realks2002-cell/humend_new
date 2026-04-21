export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import type { Member, ParentalConsent } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { getAllPayments } from "./actions";
import { getParentalConsentsByMemberIds } from "@/lib/supabase/queries";
import { PaymentsTable } from "./payments-table";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function PaymentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;

  const { data: payments, total } = await getAllPayments(page, PAGE_SIZE, search);

  const memberIds = [...new Set(
    payments.map((p) => p.work_record?.member_id).filter(Boolean) as string[]
  )];

  let membersMap: Record<string, Member> = {};
  let consentsMap: Record<string, ParentalConsent> = {};
  if (memberIds.length > 0) {
    const admin = createAdminClient();
    const [{ data }, consents] = await Promise.all([
      admin.from("members").select("*").in("id", memberIds),
      getParentalConsentsByMemberIds(memberIds),
    ]);
    membersMap = Object.fromEntries((data ?? []).map((m: Member) => [m.id, m]));
    consentsMap = consents;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">급여지급 내역</h1>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0 pt-4">
          <PaymentsTable
            payments={payments}
            membersMap={membersMap}
            consentsMap={consentsMap}
            profileImageUrls={{}}
            initialSearch={search ?? ""}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}

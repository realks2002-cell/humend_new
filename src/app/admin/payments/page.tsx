export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { MonthSelector } from "@/components/ui/month-selector";
import type { Member } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { getPaymentsByMonthPaginated } from "./actions";
import { PaymentsTable } from "./payments-table";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ month?: string; page?: string }>;
}

export default async function PaymentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const page = Math.max(1, Number(params.page) || 1);

  const { data: payments, total } = await getPaymentsByMonthPaginated(currentMonth, page, PAGE_SIZE);

  // payments에서 member_id 추출 → 필요한 회원만 조회
  const memberIds = [...new Set(
    payments.map((p) => p.work_record?.member_id).filter(Boolean) as string[]
  )];

  let membersMap: Record<string, Member> = {};
  if (memberIds.length > 0) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("members")
      .select("*")
      .in("id", memberIds);
    membersMap = Object.fromEntries((data ?? []).map((m: Member) => [m.id, m]));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">급여지급 내역</h1>
          <div className="mt-3">
            <MonthSelector currentMonth={currentMonth} basePath="/admin/payments" />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0 pt-4">
          <PaymentsTable
            payments={payments}
            membersMap={membersMap}
            profileImageUrls={{}}
            currentMonth={currentMonth}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}

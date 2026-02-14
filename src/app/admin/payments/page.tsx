export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { MonthSelector } from "@/components/ui/month-selector";
import { getAllMembers } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { getPaymentsByMonth } from "./actions";
import { PaymentsTable } from "./payments-table";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function PaymentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [payments, members] = await Promise.all([
    getPaymentsByMonth(currentMonth),
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
          <PaymentsTable payments={payments} membersMap={membersMap} profileImageUrls={profileImageUrls} />
        </CardContent>
      </Card>
    </div>
  );
}

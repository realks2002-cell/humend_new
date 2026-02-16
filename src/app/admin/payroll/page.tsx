export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { MonthSelector } from "@/components/ui/month-selector";
import { getAllWorkRecords, getAllMembers } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { PayrollTable } from "./payroll-table";
import { SheetsSync } from "./sheets-sync";

interface Props {
  searchParams: Promise<{ month?: string; status?: string }>;
}

export default async function PayrollPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [records, members] = await Promise.all([
    getAllWorkRecords({ month: currentMonth, status: params.status, signedOnly: true, pendingOnly: true }),
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
          <h1 className="text-2xl font-bold tracking-tight">급여 관리</h1>
          <div className="mt-3">
            <MonthSelector currentMonth={currentMonth} basePath="/admin/payroll" />
          </div>
        </div>
        <SheetsSync month={currentMonth} />
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0 pt-4">
          <PayrollTable records={records} month={currentMonth} membersMap={membersMap} profileImageUrls={profileImageUrls} />
        </CardContent>
      </Card>
    </div>
  );
}

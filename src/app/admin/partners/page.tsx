import { createAdminClient } from "@/lib/supabase/server";
import { PartnersTable } from "./partners-table";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const supabase = createAdminClient();

  const { data: inquiries } = await supabase
    .from("partner_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">파트너 문의</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          접수된 파트너 제휴문의를 확인하고 상태를 관리합니다.
        </p>
      </div>
      <PartnersTable inquiries={inquiries ?? []} />
    </div>
  );
}

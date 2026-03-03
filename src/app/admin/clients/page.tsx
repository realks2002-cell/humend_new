export const dynamic = "force-dynamic";

import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { CreateClientButton } from "./client-form";
import { DraggableClientList } from "./client-list";
import { createAdminClient } from "@/lib/supabase/server";
import { ClientTabs } from "./client-tabs";

async function getAllClientsWithPhotos() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("*, client_photos(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminClientsPage() {
  const clients = await getAllClientsWithPhotos();

  const dailyClients = clients.filter((c) => c.client_type !== "fixed_term");
  const fixedTermClients = clients.filter((c) => c.client_type === "fixed_term");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">고객사 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            제휴 고객사를 등록하고 관리합니다. 카드를 드래그하여 순서를 변경하세요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/10 text-emerald-700 border-0 font-semibold">
            <Building2 className="mr-1 h-3 w-3" />
            {clients.length}개사
          </Badge>
          <CreateClientButton />
        </div>
      </div>

      <ClientTabs
        dailyClients={dailyClients}
        fixedTermClients={fixedTermClients}
        dailyCount={dailyClients.length}
        fixedTermCount={fixedTermClients.length}
      />
    </div>
  );
}

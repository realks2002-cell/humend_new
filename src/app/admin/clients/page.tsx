export const dynamic = "force-dynamic";

import { CreateClientButton } from "./client-form";
import { DraggableClientList } from "./client-list";
import { createClient } from "@/lib/supabase/server";

async function getAllClientsWithPhotos() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*, client_photos(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminClientsPage() {
  const clients = await getAllClientsWithPhotos();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">고객사 관리</h1>
          <p className="mt-1 text-muted-foreground">
            제휴 고객사를 등록하고 관리합니다. 카드를 드래그하여 순서를 변경하세요.
          </p>
        </div>
        <CreateClientButton />
      </div>

      {clients.length === 0 ? (
        <p className="mt-8 py-16 text-center text-muted-foreground">
          등록된 고객사가 없습니다.
        </p>
      ) : (
        <DraggableClientList clients={clients} />
      )}
    </div>
  );
}

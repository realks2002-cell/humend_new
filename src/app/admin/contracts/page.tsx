export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllWorkRecords } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { FileSignature, FileText } from "lucide-react";
import { ContractsTable } from "./contracts-table";

export default async function AdminContractsPage() {
  const records = await getAllWorkRecords();
  const signed = records.filter((r) => r.signature_url);

  const admin = createAdminClient();
  const signatureUrls: Record<string, string> = {};
  for (const r of signed) {
    if (r.signature_url) {
      const { data } = await admin.storage
        .from("signatures")
        .createSignedUrl(r.signature_url, 3600);
      if (data?.signedUrl) {
        signatureUrls[r.id] = data.signedUrl;
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계약 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">서명 완료된 계약서를 확인합니다.</p>
        </div>
        {signed.length > 0 && (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-0 font-semibold">
            <FileSignature className="mr-1 h-3 w-3" />
            {signed.length}건 완료
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {signed.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium">완료된 계약서가 없습니다.</p>
            </div>
          ) : (
            <ContractsTable records={signed} signatureUrls={signatureUrls} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

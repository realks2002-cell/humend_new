import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText } from "lucide-react";
import { getMyProfile, getMyWorkRecords } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { ContractViewModal } from "./contract-view-modal";

export default async function ContractsPage() {
  const [profile, allRecords] = await Promise.all([
    getMyProfile(),
    getMyWorkRecords(),
  ]);

  const signedRecords = allRecords.filter((r) => r.signature_url);

  // 서명 이미지 signed URL 생성
  const admin = createAdminClient();
  const signatureUrls: Record<string, string> = {};
  for (const r of signedRecords) {
    if (r.signature_url) {
      const { data } = await admin.storage
        .from("signatures")
        .createSignedUrl(r.signature_url, 3600);
      if (data?.signedUrl) {
        signatureUrls[r.id] = data.signedUrl;
      }
    }
  }

  const worker = {
    name: profile?.name ?? "-",
    phone: profile?.phone ?? "",
    rrnFront: (profile as unknown as Record<string, unknown>)?.rrn_front as string ?? "",
    rrnBack: (profile as unknown as Record<string, unknown>)?.rrn_back as string ?? "",
    region: profile?.region ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/my" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        마이페이지
      </Link>
      <h1 className="text-2xl font-bold">계약서</h1>
      <p className="mt-1 text-muted-foreground">서명된 계약서를 확인하세요.</p>

      <div className="mt-6 space-y-3">
        {signedRecords.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              <p>서명된 계약서가 없습니다.</p>
              <p className="mt-1 text-xs">급여신청에서 전자서명을 완료하면 계약서가 생성됩니다.</p>
            </CardContent>
          </Card>
        ) : (
          signedRecords.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">{r.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.work_date)} | 실수령 {formatCurrency(r.net_pay)}
                  </p>
                  <Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-600">서명 완료</Badge>
                </div>
                <ContractViewModal
                  record={r}
                  worker={worker}
                  signatureUrl={signatureUrls[r.id] ?? null}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

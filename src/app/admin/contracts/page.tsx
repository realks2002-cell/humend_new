import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllWorkRecords } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { ContractViewModal } from "./contract-view-modal";

export default async function AdminContractsPage() {
  const records = await getAllWorkRecords();
  const signed = records.filter((r) => r.signature_url);

  // 서명 이미지 signed URL 생성
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
    <div className="p-6">
      <h1 className="text-2xl font-bold">계약 관리</h1>
      <p className="mt-1 text-muted-foreground">서명 완료된 계약서를 확인합니다.</p>

      <div className="mt-6">
        <Badge variant="default">{signed.length}건 완료</Badge>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-4">
          {signed.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">완료된 계약서가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">이름</th>
                    <th className="pb-2 pr-4">고객사</th>
                    <th className="pb-2 pr-4 hidden sm:table-cell">근무일</th>
                    <th className="pb-2 pr-4 text-right hidden md:table-cell">실수령액</th>
                    <th className="pb-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {signed.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-4">
                        <ContractViewModal
                          record={r}
                          signatureUrl={signatureUrls[r.id] ?? null}
                        />
                      </td>
                      <td className="py-2 pr-4">{r.client_name}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell">{formatDate(r.work_date)}</td>
                      <td className="py-2 pr-4 text-right hidden md:table-cell">{formatCurrency(r.net_pay)}</td>
                      <td className="py-2">
                        <Badge variant="default">체결완료</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSignedContracts } from "@/lib/supabase/queries";
import { FileSignature, FileText } from "lucide-react";
import { ContractsTable } from "./contracts-table";

const PAGE_SIZE = 50;

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { data: signed, total } = await getSignedContracts(page, PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계약 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">서명 완료된 계약서를 확인합니다.</p>
        </div>
        {total > 0 && (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-0 font-semibold">
            <FileSignature className="mr-1 h-3 w-3" />
            {total}건 완료
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {signed.length === 0 && page === 1 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium">완료된 계약서가 없습니다.</p>
            </div>
          ) : (
            <ContractsTable
              records={signed}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

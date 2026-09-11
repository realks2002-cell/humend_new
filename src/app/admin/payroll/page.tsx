export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { getAllWorkRecords } from "@/lib/supabase/queries";
import { PayrollTable } from "./payroll-table";
import { SheetsSync } from "./sheets-sync";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function PayrollPage({ searchParams }: Props) {
  const params = await searchParams;
  const records = await getAllWorkRecords({ status: params.status, signedOnly: true, pendingOnly: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">급여 관리</h1>
        </div>
        <SheetsSync />
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0 pt-4">
          <PayrollTable records={records} />
        </CardContent>
      </Card>
    </div>
  );
}

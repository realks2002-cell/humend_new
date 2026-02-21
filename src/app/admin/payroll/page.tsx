export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { MonthSelector } from "@/components/ui/month-selector";
import { getAllWorkRecords } from "@/lib/supabase/queries";
import { PayrollTable } from "./payroll-table";
import { SheetsSync } from "./sheets-sync";

interface Props {
  searchParams: Promise<{ month?: string; status?: string }>;
}

export default async function PayrollPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const records = await getAllWorkRecords({ month: currentMonth, status: params.status, signedOnly: true, pendingOnly: true });

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
          <PayrollTable records={records} month={currentMonth} />
        </CardContent>
      </Card>
    </div>
  );
}

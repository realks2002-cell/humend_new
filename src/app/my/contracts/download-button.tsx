"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { type WorkRecord } from "@/lib/supabase/queries";
import { generateContractPDF } from "@/lib/pdf/generate-contract";

export function DownloadButton({ record }: { record: WorkRecord }) {
  async function handleDownload() {
    const doc = generateContractPDF(record);
    doc.save(`계약서_${record.client_name}_${record.work_date}.pdf`);
  }

  return (
    <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleDownload}>
      <Download className="mr-1 h-3 w-3" />
      PDF
    </Button>
  );
}

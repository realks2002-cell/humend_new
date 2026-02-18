"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { exportPayrollToSheets, importPayrollFromSheets } from "./sheets-actions";

export function SheetsSync({ month }: { month: string }) {
  const [loading, setLoading] = useState<"export" | "import" | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  async function handleExport() {
    setLoading("export");
    const result = await exportPayrollToSheets(month);
    if (result.success) {
      toast.success(`${result.count}건 내보내기 완료`);
      if (result.sheetUrl) {
        setSheetUrl(result.sheetUrl);
        window.open(result.sheetUrl, "_blank");
      }
    } else {
      toast.error("내보내기 실패", { description: result.error });
    }
    setLoading(null);
  }

  async function handleImport() {
    setLoading("import");
    const result = await importPayrollFromSheets(month);
    if (result.success) {
      const parts: string[] = [];
      if (result.updated) parts.push(`${result.updated}건 수정`);
      if (result.created) parts.push(`${result.created}건 신규 생성`);
      const summary = parts.length > 0 ? parts.join(", ") : "변경 없음";

      if (result.errors) {
        toast.warning(`${summary} (일부 오류)`, {
          description: result.errors,
        });
      } else {
        toast.success(summary);
      }
      window.location.reload(); // 데이터 새로고침
    } else {
      toast.error("가져오기 실패", { description: result.error });
    }
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={loading !== null}
      >
        <ExternalLink className="mr-1 h-3 w-3" />
        {loading === "export" ? "내보내는 중..." : "구글 시트에서 편집"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleImport}
        disabled={loading !== null}
      >
        <Download className="mr-1 h-3 w-3" />
        {loading === "import" ? "가져오는 중..." : "시트에서 가져오기"}
      </Button>
      {sheetUrl && (
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          시트 다시 열기
        </a>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PayslipContent } from "@/app/my/salary/payslip-modal";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { type SignedContract } from "@/lib/supabase/queries";
import { ContractViewModal } from "./contract-view-modal";
import { getSignatureUrl } from "./actions";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ContractsTableProps {
  records: SignedContract[];
  page: number;
  pageSize: number;
  total: number;
}

export function ContractsTable({ records, page, pageSize, total }: ContractsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<SignedContract | null>(null);
  const [selectedSignatureUrl, setSelectedSignatureUrl] = useState<string | null>(null);
  const [payslipRecord, setPayslipRecord] = useState<SignedContract | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / pageSize);

  function handleContractView(record: SignedContract) {
    startTransition(async () => {
      const url = record.signature_url ? await getSignatureUrl(record.signature_url) : null;
      setSelectedSignatureUrl(url);
      setSelectedRecord(record);
    });
  }

  function goToPage(p: number) {
    router.push(`/admin/contracts?page=${p}`);
  }

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const d = r.work_date;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      if (!search) return true;
      const name = r.members?.name ?? "";
      const phone = (r.members?.phone ?? "").replace(/-/g, "");
      const s = search.replace(/-/g, "");
      return (
        name.includes(search) ||
        phone.includes(s) ||
        r.client_name.includes(search)
      );
    });
  }, [records, search, startDate, endDate]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Input
          placeholder="이름, 전화번호 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[180px] h-9 text-sm"
        />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[145px] h-9 text-sm"
        />
        <span className="text-xs text-muted-foreground">~</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[145px] h-9 text-sm"
        />
        {(search || startDate || endDate) && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }}
          >
            초기화
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length}건</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[80px]" />
            <col className="w-[120px] hidden sm:table-column" />
            <col className="w-[100px]" />
            <col className="w-[100px] hidden sm:table-column" />
            <col className="w-[110px] hidden md:table-column" />
            <col className="w-[100px] hidden md:table-column" />
            <col className="w-[80px]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-gradient-to-r from-slate-50 to-gray-50/50 text-center text-xs font-semibold text-muted-foreground">
              <th className="px-2 py-3">이름</th>
              <th className="px-2 py-3 hidden sm:table-cell">전화번호</th>
              <th className="px-2 py-3">고객사</th>
              <th className="px-2 py-3 hidden sm:table-cell">근무일</th>
              <th className="px-2 py-3 hidden md:table-cell">시급/일급</th>
              <th className="px-2 py-3 hidden md:table-cell">실수령액</th>
              <th className="px-2 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const rawPhone = ((r.members?.phone as string) ?? "").replace(/\D/g, "");
                const phone = rawPhone.length === 11
                  ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
                  : rawPhone.length === 10
                    ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
                    : rawPhone;
                return (
                  <tr key={r.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        disabled={isPending}
                        onClick={() => handleContractView(r)}
                      >
                        {r.members?.name ?? "-"}
                      </button>
                    </td>
                    <td className="px-2 py-3 hidden sm:table-cell text-center text-muted-foreground">{phone || "-"}</td>
                    <td className="px-2 py-3 text-center font-medium">{r.client_name}</td>
                    <td className="px-2 py-3 hidden sm:table-cell text-center text-muted-foreground">{formatDate(r.work_date)}</td>
                    <td className="px-2 py-3 hidden md:table-cell text-center">
                      <Badge variant="outline" className="text-xs font-medium">
                        {r.wage_type ?? "-"}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 hidden md:table-cell text-center font-semibold">{formatCurrency(r.net_pay)}</td>
                    <td className="px-2 py-3 text-center">
                      <Badge
                        className="bg-emerald-500/10 text-emerald-700 border-0 text-[10px] font-semibold cursor-pointer hover:bg-emerald-500/20 transition-colors"
                        onClick={() => setPayslipRecord(r)}
                      >
                        체결완료
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 border-t px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-1 text-xs text-muted-foreground">...</span>
              ) : (
                <Button
                  key={item}
                  variant={item === page ? "default" : "ghost"}
                  size="sm"
                  onClick={() => goToPage(item)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {item}
                </Button>
              )
            )}
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {selectedRecord && (
        <ContractViewModal
          record={selectedRecord}
          signatureUrl={selectedSignatureUrl}
          open={!!selectedRecord}
          onOpenChange={(open) => { if (!open) { setSelectedRecord(null); setSelectedSignatureUrl(null); } }}
        />
      )}

      {/* 급여명세서 모달 */}
      <Dialog open={!!payslipRecord} onOpenChange={(open) => { if (!open) setPayslipRecord(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>급여지급 명세서</DialogTitle>
          </DialogHeader>
          {payslipRecord && <PayslipContent record={payslipRecord} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

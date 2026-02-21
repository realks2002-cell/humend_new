"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { type WorkRecord } from "@/lib/supabase/queries";
import { ContractViewModal } from "./contract-view-modal";

interface ContractsTableProps {
  records: WorkRecord[];
  signatureUrls: Record<string, string>;
}

export function ContractsTable({ records, signatureUrls }: ContractsTableProps) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
            <col className="w-[100px] hidden md:table-column" />
            <col className="w-[80px]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-gradient-to-r from-slate-50 to-gray-50/50 text-center text-xs font-semibold text-muted-foreground">
              <th className="px-2 py-3">이름</th>
              <th className="px-2 py-3 hidden sm:table-cell">전화번호</th>
              <th className="px-2 py-3">고객사</th>
              <th className="px-2 py-3 hidden sm:table-cell">근무일</th>
              <th className="px-2 py-3 hidden md:table-cell">실수령액</th>
              <th className="px-2 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
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
                      <ContractViewModal
                        record={r}
                        signatureUrl={signatureUrls[r.id] ?? null}
                      />
                    </td>
                    <td className="px-2 py-3 hidden sm:table-cell text-center text-muted-foreground">{phone || "-"}</td>
                    <td className="px-2 py-3 text-center font-medium">{r.client_name}</td>
                    <td className="px-2 py-3 hidden sm:table-cell text-center text-muted-foreground">{formatDate(r.work_date)}</td>
                    <td className="px-2 py-3 hidden md:table-cell text-center font-semibold">{formatCurrency(r.net_pay)}</td>
                    <td className="px-2 py-3 text-center">
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-0 text-[10px] font-semibold">체결완료</Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

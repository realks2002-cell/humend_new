"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { type WorkRecord } from "@/lib/supabase/queries";
import { bulkConfirm, bulkMarkPaid } from "./actions";
import { PaymentEditModal } from "./payment-edit-modal";

const statusColors: Record<string, "secondary" | "default" | "destructive"> = {
  "대기": "secondary",
  "확정": "default",
  "지급완료": "default",
};

export function PayrollTable({ records, month }: { records: WorkRecord[]; month: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<"confirm" | "paid" | null>(null);
  const [editRecord, setEditRecord] = useState<WorkRecord | null>(null);

  const filtered = records.filter((r) => {
    if (!search) return true;
    const s = search.replace(/-/g, "");
    const name = r.members?.name ?? "";
    const phone = (r.members?.phone ?? "").replace(/-/g, "");
    const workDate = r.work_date.replace(/-/g, "");
    return (
      name.includes(search) ||
      phone.includes(s) ||
      r.work_date.includes(search) ||
      workDate.includes(s) ||
      r.client_name.includes(search)
    );
  });

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleBulkAction() {
    if (!confirmAction || selected.size === 0) return;
    setLoading(true);
    const ids = Array.from(selected);
    if (confirmAction === "confirm") await bulkConfirm(ids);
    else await bulkMarkPaid(ids);
    toast.success(`${ids.length}건 ${confirmAction === "confirm" ? "확정" : "지급완료"} 처리되었습니다`);
    setSelected(new Set());
    setConfirmAction(null);
    setLoading(false);
  }

  // payment 있으면 최종본 기준, 없으면 원본
  function getDisplayPay(r: WorkRecord) {
    const p = r.payments;
    return {
      grossPay: p?.gross_pay ?? r.gross_pay,
      netPay: p?.net_pay ?? r.net_pay,
      hasPayment: !!p,
      isDiff: p ? p.net_pay !== r.net_pay : false,
    };
  }

  function getDisplayStatus(r: WorkRecord) {
    if (r.payments) return r.payments.status;
    return r.status;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="이름, 전화번호, 근무일 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={selected.size === 0 || loading}
            onClick={() => setConfirmAction("confirm")}
          >
            확정 처리 ({selected.size})
          </Button>
          <Button
            size="sm"
            disabled={selected.size === 0 || loading}
            onClick={() => setConfirmAction("paid")}
          >
            지급완료 ({selected.size})
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-2">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="pb-2 pr-4">이름</th>
              <th className="pb-2 pr-4">근무지</th>
              <th className="pb-2 pr-4 hidden sm:table-cell">급여타입</th>
              <th className="pb-2 pr-4 hidden sm:table-cell text-right">시급</th>
              <th className="pb-2 pr-4 hidden md:table-cell">근무시간</th>
              <th className="pb-2 pr-4 text-right">총지급액</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  급여 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const display = getDisplayPay(r);
                const status = getDisplayStatus(r);
                const rawPhone = (r.members?.phone ?? "").replace(/\D/g, "");
                const phone = rawPhone.length === 11
                  ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
                  : rawPhone.length === 10
                    ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
                    : rawPhone;
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b hover:bg-muted/50"
                    onClick={() => setEditRecord(r)}
                  >
                    <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{r.members?.name ?? "-"}</div>
                      {phone && (
                        <div className="text-xs text-muted-foreground">{phone}</div>
                      )}
                    </td>
                    <td className="py-2 pr-4">{r.client_name}</td>
                    <td className="py-2 pr-4 hidden sm:table-cell">
                      <Badge variant={r.wage_type === "일급" ? "default" : "secondary"}>
                        {r.wage_type ?? "시급"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 hidden sm:table-cell text-right">{formatCurrency(r.hourly_wage)}</td>
                    <td className="py-2 pr-4 hidden md:table-cell">{r.work_hours + r.overtime_hours}h</td>
                    <td className="py-2 pr-4 text-right font-medium">
                      {formatCurrency(display.grossPay)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editRecord && (
        <PaymentEditModal
          record={editRecord}
          open={!!editRecord}
          onOpenChange={(open) => { if (!open) setEditRecord(null); }}
        />
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "confirm" ? "급여 확정" : "지급완료 처리"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selected.size}건을{" "}
              {confirmAction === "confirm" ? "확정" : "지급완료"} 처리하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction} disabled={loading}>
              {loading ? "처리 중..." : "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

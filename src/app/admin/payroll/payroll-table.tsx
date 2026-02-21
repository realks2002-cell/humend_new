"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";
import { type WorkRecord, type Member } from "@/lib/supabase/queries";
import { MemberDetailModal } from "../members/member-detail-modal";
import { ContractViewModal } from "../contracts/contract-view-modal";
import { deleteWorkRecord } from "./actions";

interface PayrollTableProps {
  records: WorkRecord[];
  month: string;
  membersMap: Record<string, Member>;
  profileImageUrls: Record<string, string>;
  signatureUrls: Record<string, string>;
}

export function PayrollTable({ records, month, membersMap, profileImageUrls, signatureUrls }: PayrollTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = records.filter((r) => {
      const d = r.work_date;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      if (!search) return true;
      const s = search.replace(/-/g, "");
      const name = r.members?.name ?? "";
      const phone = (r.members?.phone ?? "").replace(/-/g, "");
      return (
        name.includes(search) ||
        phone.includes(s) ||
        r.client_name.includes(search)
      );
    });
    // 요청일(created_at) 최신순 정렬
    list.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return list;
  }, [records, search, startDate, endDate]);

  async function handleDelete(id: string) {
    if (!confirm("이 급여 내역을 삭제하시겠습니까?")) return;
    setDeletingId(id);
    const result = await deleteWorkRecord(id);
    setDeletingId(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("삭제되었습니다.");
      router.refresh();
    }
  }

  function getDisplayPay(r: WorkRecord) {
    const p = r.payments;
    return {
      grossPay: p?.gross_pay ?? r.gross_pay,
      netPay: p?.net_pay ?? r.net_pay,
    };
  }

  function getDisplayStatus(r: WorkRecord) {
    if (r.payments) return r.payments.status;
    return r.status;
  }

  return (
    <div>
      <div className="mb-4 px-4 flex flex-wrap items-center gap-2">
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
        {(startDate || endDate || search) && (
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

      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-center text-muted-foreground">
              <th className="pb-2 px-2">이름</th>
              <th className="pb-2 px-2">근무지</th>
              <th className="pb-2 px-2 hidden sm:table-cell">요청일</th>
              <th className="pb-2 px-2 hidden sm:table-cell">시작시간</th>
              <th className="pb-2 px-2 hidden sm:table-cell">종료시간</th>
              <th className="pb-2 px-2 hidden sm:table-cell">급여타입</th>
              <th className="pb-2 px-2 hidden sm:table-cell">시급</th>
              <th className="pb-2 px-2 hidden md:table-cell">근무시간</th>
              <th className="pb-2 px-2 hidden sm:table-cell">공제내역</th>
              <th className="pb-2 px-2 hidden sm:table-cell">상태</th>
              <th className="pb-2 px-2">총지급액</th>
              <th className="pb-2 px-2 hidden sm:table-cell">계약서</th>
              <th className="pb-2 px-2 hidden sm:table-cell">계약서 보기</th>
              <th className="pb-2 px-2 hidden sm:table-cell">삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-muted-foreground">
                  급여 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const display = getDisplayPay(r);
                const status = getDisplayStatus(r);
                const member = membersMap[r.member_id] ?? null;
                const rawPhone = (r.members?.phone ?? "").replace(/\D/g, "");
                const phone = rawPhone.length === 11
                  ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
                  : rawPhone.length === 10
                    ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
                    : rawPhone;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 text-center">
                      {member ? (
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => setSelectedMember(member)}
                        >
                          <div className="font-medium text-blue-600">
                            {r.members?.name ?? "-"}
                          </div>
                        </button>
                      ) : (
                        <div className="font-medium">{r.members?.name ?? "-"}</div>
                      )}
                      {phone && (
                        <div className="text-xs text-muted-foreground">{phone}</div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">{r.client_name}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center whitespace-nowrap text-xs text-muted-foreground">
                      {r.created_at ? r.created_at.slice(0, 10) : "-"}
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center whitespace-nowrap">{r.start_time?.slice(0, 5)}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center whitespace-nowrap">{r.end_time?.slice(0, 5)}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      <Badge variant={r.wage_type === "일급" ? "default" : "secondary"}>
                        {r.wage_type ?? "시급"}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">{formatCurrency(r.hourly_wage)}</td>
                    <td className="py-2 px-2 hidden md:table-cell text-center">{r.work_hours + r.overtime_hours}h</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center text-xs text-muted-foreground whitespace-nowrap">
                      {r.total_deduction > 0 ? formatCurrency(r.total_deduction) : "-"}
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      <Badge variant={status === "확정" ? "default" : "secondary"} className={status === "확정" ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                        {status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center font-medium">
                      {formatCurrency(display.grossPay)}
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      <Badge variant={r.signature_url ? "default" : "secondary"} className={r.signature_url ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                        {r.signature_url ? "체결완료" : "미체결"}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      {r.signature_url ? (
                        <ContractViewModal
                          record={r}
                          signatureUrl={signatureUrls[r.id] ?? null}
                          trigger={<Button variant="outline" size="sm">보기</Button>}
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <MemberDetailModal
        member={selectedMember}
        profileImageUrl={selectedMember ? profileImageUrls[selectedMember.id] ?? null : null}
        workRecords={[]}
        open={!!selectedMember}
        onOpenChange={(open) => { if (!open) setSelectedMember(null); }}
      />
    </div>
  );
}

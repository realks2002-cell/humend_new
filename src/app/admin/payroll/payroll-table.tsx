"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { type WorkRecord, type Member } from "@/lib/supabase/queries";
import { MemberDetailModal } from "../members/member-detail-modal";

interface PayrollTableProps {
  records: WorkRecord[];
  month: string;
  membersMap: Record<string, Member>;
  profileImageUrls: Record<string, string>;
}

export function PayrollTable({ records, month, membersMap, profileImageUrls }: PayrollTableProps) {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

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
      <div className="mb-4 px-4">
        <Input
          placeholder="이름, 전화번호, 근무일 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4">이름</th>
              <th className="pb-2 pr-4">근무지</th>
              <th className="pb-2 pr-4 hidden sm:table-cell">급여타입</th>
              <th className="pb-2 pr-4 hidden sm:table-cell text-right">시급</th>
              <th className="pb-2 pr-4 hidden md:table-cell">근무시간</th>
              <th className="pb-2 pr-4 hidden sm:table-cell">상태</th>
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
                const member = membersMap[r.member_id] ?? null;
                const rawPhone = (r.members?.phone ?? "").replace(/\D/g, "");
                const phone = rawPhone.length === 11
                  ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
                  : rawPhone.length === 10
                    ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
                    : rawPhone;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4">
                      {member ? (
                        <button
                          type="button"
                          className="text-left hover:underline"
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
                    <td className="py-2 pr-4">{r.client_name}</td>
                    <td className="py-2 pr-4 hidden sm:table-cell">
                      <Badge variant={r.wage_type === "일급" ? "default" : "secondary"}>
                        {r.wage_type ?? "시급"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 hidden sm:table-cell text-right">{formatCurrency(r.hourly_wage)}</td>
                    <td className="py-2 pr-4 hidden md:table-cell">{r.work_hours + r.overtime_hours}h</td>
                    <td className="py-2 pr-4 hidden sm:table-cell">
                      <Badge variant={status === "확정" ? "default" : "secondary"} className={status === "확정" ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                        {status}
                      </Badge>
                    </td>
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

      <MemberDetailModal
        member={selectedMember}
        profileImageUrl={selectedMember ? profileImageUrls[selectedMember.id] ?? null : null}
        open={!!selectedMember}
        onOpenChange={(open) => { if (!open) setSelectedMember(null); }}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MemberWithStats } from "@/lib/supabase/queries";
import { formatPhone } from "@/lib/utils/format";
import { MemberDetailModal } from "./member-detail-modal";
import { deleteMemberAction, getMemberWorkRecords } from "./actions";
import { getMemberDetail } from "../payments/actions";
import { Search, Trash2 } from "lucide-react";

interface MembersTableProps {
  members: MemberWithStats[];
}

export function MembersTable({ members }: MembersTableProps) {
  const [selected, setSelected] = useState<MemberWithStats | null>(null);
  const [selectedProfileUrl, setSelectedProfileUrl] = useState<string | null>(null);
  const [selectedWorkRecords, setSelectedWorkRecords] = useState<{ client_name: string; work_date: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleMemberClick(member: MemberWithStats) {
    setSelected(member);
    setSelectedProfileUrl(null);
    setSelectedWorkRecords([]);
    startTransition(async () => {
      const [{ profileImageUrl }, workRecords] = await Promise.all([
        getMemberDetail(member.id),
        getMemberWorkRecords(member.id),
      ]);
      setSelectedProfileUrl(profileImageUrl);
      setSelectedWorkRecords(workRecords);
    });
  }

  const filtered = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (m.name ?? "").toLowerCase();
    const phone = m.phone;
    const rrn = m.rrn_front ?? "";
    return name.includes(q) || phone.includes(q) || rrn.includes(q);
  });

  function handleDelete(memberId: string, memberName: string | null) {
    if (!confirm(`"${memberName ?? "이름 없음"}" 회원을 삭제하시겠습니까?`)) return;
    setDeletingId(memberId);
    startTransition(async () => {
      const result = await deleteMemberAction(memberId);
      if (result.error) {
        alert(result.error);
      }
      setDeletingId(null);
    });
  }

  return (
    <>
      <div className="p-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름, 전화번호, 주민번호 검색"
            className="pl-9 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-center">
              <th className="px-2 py-3 font-medium">이름</th>
              <th className="px-2 py-3 font-medium">전화번호</th>
              <th className="hidden px-2 py-3 font-medium md:table-cell">주민번호</th>
              <th className="hidden px-2 py-3 font-medium md:table-cell">성별</th>
              <th className="hidden px-2 py-3 font-medium lg:table-cell">근무일수</th>
              <th className="hidden px-2 py-3 font-medium lg:table-cell">근무시간</th>
              <th className="px-2 py-3 font-medium">상태</th>
              <th className="px-2 py-3 font-medium w-[60px]">삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">
                  {searchQuery ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      className="font-medium text-blue-600 hover:underline"
                      onClick={() => handleMemberClick(m)}
                    >
                      {m.name ?? "-"}
                    </button>
                  </td>
                  <td className="px-2 py-3 text-center text-muted-foreground">{formatPhone(m.phone)}</td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground md:table-cell">
                    {m.rrn_front ? `${m.rrn_front}-*******` : "-"}
                  </td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground md:table-cell">
                    {m.gender ?? "-"}
                  </td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground lg:table-cell">
                    {m.work_days}일
                  </td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground lg:table-cell">
                    {m.work_hours.toFixed(1)}h
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>
                      {m.status === "active" ? "활성" : "비활성"}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={isPending && deletingId === m.id}
                      onClick={() => handleDelete(m.id, m.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MemberDetailModal
        member={selected}
        profileImageUrl={selectedProfileUrl}
        workRecords={selectedWorkRecords}
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </>
  );
}

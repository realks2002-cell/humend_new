"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Member } from "@/lib/supabase/queries";
import { formatPhone } from "@/lib/utils/format";
import { MemberDetailModal } from "./member-detail-modal";

export function MembersTable({ members, profileImageUrls }: { members: Member[]; profileImageUrls: Record<string, string> }) {
  const [selected, setSelected] = useState<Member | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <col className="w-[100px] hidden md:table-column" />
            <col className="w-[80px]" />
            <col className="w-[100px] hidden md:table-column" />
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/50 text-center">
              <th className="px-2 py-3 font-medium">이름</th>
              <th className="px-2 py-3 font-medium">전화번호</th>
              <th className="hidden px-2 py-3 font-medium md:table-cell">지역</th>
              <th className="px-2 py-3 font-medium">상태</th>
              <th className="hidden px-2 py-3 font-medium md:table-cell">가입일</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">
                  등록된 회원이 없습니다.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      className="font-medium text-blue-600 hover:underline"
                      onClick={() => setSelected(m)}
                    >
                      {m.name ?? "-"}
                    </button>
                  </td>
                  <td className="px-2 py-3 text-center text-muted-foreground">{formatPhone(m.phone)}</td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground md:table-cell">
                    {m.region ?? "-"}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>
                      {m.status === "active" ? "활성" : "비활성"}
                    </Badge>
                  </td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground md:table-cell">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString("ko-KR") : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MemberDetailModal
        member={selected}
        profileImageUrl={selected ? profileImageUrls[selected.id] ?? null : null}
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </>
  );
}

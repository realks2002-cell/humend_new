"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { Member } from "@/lib/supabase/queries";
import { formatPhone } from "@/lib/utils/format";
import { MemberDetailModal } from "./member-detail-modal";

export function MembersTable({ members, profileImageUrls }: { members: Member[]; profileImageUrls: Record<string, string> }) {
  const [selected, setSelected] = useState<Member | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">전화번호</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">지역</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">가입일</th>
              <th className="px-4 py-3 font-medium">상세</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  등록된 회원이 없습니다.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{m.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatPhone(m.phone)}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {m.region ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>
                      {m.status === "active" ? "활성" : "비활성"}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelected(m)}
                    >
                      <Eye className="h-4 w-4" />
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
        profileImageUrl={selected ? profileImageUrls[selected.id] ?? null : null}
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </>
  );
}

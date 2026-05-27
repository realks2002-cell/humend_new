"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAnnouncement, type AdminAnnouncement } from "./actions";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AnnouncementList({ items }: { items: AdminAnnouncement[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("이 공지를 삭제하시겠습니까?")) return;
    setDeletingId(id);
    const result = await deleteAnnouncement(id);
    setDeletingId(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("공지가 삭제되었습니다.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-[#091413]">등록된 공지</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[#6B7280]">등록된 공지가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-[5px] border border-[#D7D7D7] bg-white">
          <table className="w-full whitespace-nowrap text-xs">
            <thead className="bg-[#F5F5F5] text-[11px] text-[#6B7280]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">제목</th>
                <th className="px-3 py-2 text-center font-medium">대상</th>
                <th className="px-3 py-2 text-center font-medium">읽음</th>
                <th className="px-3 py-2 text-center font-medium">작성일</th>
                <th className="px-3 py-2 text-center font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7D7D7]">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-[#F5F5F5]">
                  <td className="max-w-[280px] truncate px-3 py-2 font-medium text-[#091413]">
                    {a.title}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {a.target_type === "all" ? (
                      <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[#4B5563]">전체</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">개별</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-[#091413]">
                    {a.read_count}
                  </td>
                  <td className="px-3 py-2 text-center text-[#6B7280]">
                    {new Date(a.created_at).toLocaleDateString("ko-KR", {
                      year: "2-digit",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

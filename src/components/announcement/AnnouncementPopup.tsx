"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Announcement = {
  id: string;
  title: string;
  body: string;
  font_size: number;
  created_at: string;
};

export default function AnnouncementPopup() {
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const current = queue[0] ?? null;

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("get_unread_announcements");
      if (error) return;

      const items = (data ?? []) as Announcement[];
      if (items.length > 0) {
        setQueue(items);
        setTotal(items.length);
        setOpen(true);
      }
    } catch {
      // 조회 실패는 조용히 무시 (공지는 부가 기능)
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm() {
    if (!current) return;
    const id = current.id;
    const rest = queue.slice(1);

    // 닫기 애니메이션 후 다음 공지 표시 (body-lock 정상 해제 보장)
    setOpen(false);
    setTimeout(() => {
      setQueue(rest);
      if (rest.length > 0) setOpen(true);
    }, 200);

    try {
      const supabase = createClient();
      await supabase.rpc("mark_announcement_read", { p_announcement_id: id });
    } catch {
      // 읽음 처리 실패해도 UX 흐름은 유지
    }
  }

  const currentIndex = total - queue.length + 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-sm gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center gap-2 bg-[#273F4F] px-4 py-3 text-white">
          <Megaphone className="h-4 w-4" />
          <DialogTitle className="text-sm font-semibold text-white">공지사항</DialogTitle>
          {total > 1 && (
            <span className="ml-auto text-xs opacity-80 tabular-nums">
              {currentIndex}/{total}
            </span>
          )}
        </div>
        <div className="space-y-3 p-4">
          <p className="font-semibold text-[#091413]">{current?.title}</p>
          <p
            className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-[#4B5563]"
            style={{ fontSize: `${current?.font_size ?? 16}px` }}
          >
            {current?.body}
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            className="mt-1 w-full rounded-[5px] bg-[#273F4F] py-2.5 text-sm font-medium text-white hover:bg-[#1e2f3a]"
          >
            확인
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

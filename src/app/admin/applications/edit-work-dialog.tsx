"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resetApplicationWork, updateApplicationWork } from "./actions";

interface EditWorkDialogProps {
  applicationId: string;
  approved: boolean;
  overridden: boolean;
  clientId: string;
  clientName: string;
  startTime: string;
  endTime: string;
  clients: { id: string; company_name: string }[];
}

export function EditWorkDialog({ applicationId, approved, overridden, clientId, clientName, startTime, endTime, clients }: EditWorkDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ clientId, startTime, endTime });
  const [isPending, startTransition] = useTransition();

  function handleOpen(next: boolean) {
    if (next) setForm({ clientId, startTime, endTime });
    setOpen(next);
  }

  function run(action: () => Promise<{ error: string | null; updatedRecords?: number }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error("수정 실패", { description: result.error });
        return;
      }
      toast.success(result.updatedRecords ? `수정 완료 (계약서 ${result.updatedRecords}건 반영)` : "수정 완료");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleOpen(true)}
        aria-label="근무지·근무시간 수정"
        title="근무지·근무시간 수정"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>근무지·근무시간 수정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">근무지</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              {!clients.some((c) => c.id === clientId) && <option value={clientId}>{clientName}</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">시작</span>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">종료</span>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {approved
              ? "저장하면 회원 지원내역과 계약서(서명된 계약서 포함)가 바뀌고, 시급은 새 근무지 기준으로 다시 계산됩니다. 출근 위치 확인은 근무표 배정을 따르니 근무표도 함께 수정하세요."
              : "저장하면 회원 지원내역에 바로 반영되고, 승인할 때 이 근무지·시간으로 계약서가 만들어집니다."}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {overridden ? (
            <Button variant="outline" disabled={isPending} onClick={() => run(() => resetApplicationWork(applicationId))}>
              공고 값으로 되돌리기
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>취소</Button>
            <Button disabled={isPending} onClick={() => run(() => updateApplicationWork(applicationId, form))}>
              {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

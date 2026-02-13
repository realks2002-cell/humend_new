"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { applyToJob } from "@/app/jobs/actions";

const MEMBER_NOT_FOUND_ERROR = "회원정보를 먼저 등록해주세요.";

interface ApplyButtonProps {
  postingId: string;
  clientName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  size?: "sm" | "default";
  className?: string;
}

export function ApplyButton({
  postingId,
  clientName,
  workDate,
  startTime,
  endTime,
  size = "sm",
  className,
}: ApplyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const isMemberNotFound = result?.error === MEMBER_NOT_FOUND_ERROR;

  const handleApply = async () => {
    setLoading(true);
    const res = await applyToJob(postingId);
    setLoading(false);
    setResult(res);

    if (res.success) {
      toast.success("지원이 완료되었습니다", { description: "관리자 승인 후 근무가 확정됩니다." });
      setTimeout(() => {
        setOpen(false);
        setResult(null);
        router.refresh();
      }, 1500);
    } else if (res.error && res.error !== MEMBER_NOT_FOUND_ERROR) {
      toast.error("지원 실패", { description: res.error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        <Button size={size} variant="outline" className={`rounded-none border-gray-400 ${className ?? ""}`}>
          지원하기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        {result?.success ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-green-600">지원 완료!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              관리자 승인 후 근무가 확정됩니다.
            </p>
          </div>
        ) : isMemberNotFound ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <UserX className="h-7 w-7 text-amber-500" />
            </div>
            <p className="text-lg font-semibold">지원할 수 없습니다</p>
            <p className="mt-2 text-sm text-muted-foreground">
              회원정보가 등록되어 있지 않아 지원이 불가합니다.<br />
              회원정보를 먼저 등록해주세요.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  setResult(null);
                  router.push("/my/resume");
                }}
              >
                회원정보 등록하기
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setOpen(false); setResult(null); }}
              >
                닫기
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>지원하시겠습니까?</DialogTitle>
              <DialogDescription>
                {clientName} {workDate} {startTime}~{endTime}
              </DialogDescription>
            </DialogHeader>
            {result?.error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {result.error}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                취소
              </Button>
              <Button onClick={handleApply} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                지원하기
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

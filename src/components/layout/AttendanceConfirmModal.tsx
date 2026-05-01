"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AttendanceConfirmModal({ open, onOpenChange }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onOpenChange(false), 7000);
    return () => clearTimeout(t);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="sr-only">자동 출근 확인</DialogTitle>
        <DialogDescription className="sr-only">자동 출근 확인 진행 중 안내</DialogDescription>
        <div className="flex flex-col gap-3 pt-2 text-center">
          <p className="text-base font-medium leading-relaxed">
            자동 출근 확인 중... 출근 완료될 때까지 앱을 유지해 주세요
          </p>
          <p className="text-sm text-muted-foreground">(강제종료❌)</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

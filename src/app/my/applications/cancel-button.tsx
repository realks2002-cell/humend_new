"use client";

import { useState, useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cancelApplication } from "../actions";

interface CancelButtonProps {
  applicationId: string;
  status: string;
}

export function CancelButton({ applicationId, status }: CancelButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelApplication(applicationId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("지원이 취소되었습니다.");
      }
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
          <X className="h-3.5 w-3.5 mr-1" />
          취소
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>지원을 취소하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            {status === "승인"
              ? "승인된 근무가 함께 취소됩니다. 이 작업은 되돌릴 수 없습니다."
              : "취소된 지원은 되돌릴 수 없습니다."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>닫기</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleCancel} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            취소하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

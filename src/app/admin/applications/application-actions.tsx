"use client";

import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { approveApplication, rejectApplication, revertApplicationToPending } from "./actions";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await approveApplication(applicationId);
      if (result?.headcountFull) {
        toast.error("모집인원이 모두 차서 더 이상 승인할 수 없습니다.");
      } else if (result?.error) {
        toast.error(result.error);
      }
    } catch (e) {
      console.error("승인 처리 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectApplication(applicationId);
    } catch (e) {
      console.error("거절 처리 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        className="h-6 px-1.5 text-[11px] bg-green-600 text-white hover:bg-green-700"
        onClick={handleApprove}
      >
        <Check className="mr-0.5 h-3 w-3" />
        승인
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="h-6 px-1.5 text-[11px]"
        onClick={handleReject}
      >
        <X className="mr-0.5 h-3 w-3" />
        거절
      </Button>
    </div>
  );
}

export function RevertAction({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRevert = async () => {
    setLoading(true);
    try {
      await revertApplicationToPending(applicationId);
    } catch (e) {
      console.error("대기 복귀 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-6 px-1.5 text-[11px]"
      onClick={handleRevert}
    >
      <Undo2 className="mr-0.5 h-3 w-3" />
      대기로
    </Button>
  );
}

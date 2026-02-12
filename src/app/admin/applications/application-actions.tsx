"use client";

import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { approveApplication, rejectApplication } from "./actions";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveApplication(applicationId);
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
    <div className="flex gap-2">
      <Button
        size="sm"
        className="bg-green-600 text-white hover:bg-green-700"
        onClick={handleApprove}
      >
        <Check className="mr-1 h-4 w-4" />
        승인
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleReject}
      >
        <X className="mr-1 h-4 w-4" />
        거절
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { approveApplication, rejectApplication } from "./applications/actions";

interface PendingActionsProps {
  applicationId: string;
}

export function PendingActions({ applicationId }: PendingActionsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-xs text-muted-foreground">처리됨</span>;
  }

  const handleApprove = async () => {
    setLoading("approve");
    const result = await approveApplication(applicationId);
    setLoading(null);
    if (result.error) {
      toast.error("승인 실패", { description: result.error });
    } else {
      toast.success("승인 처리되었습니다");
      setDone(true);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    const result = await rejectApplication(applicationId);
    setLoading(null);
    if (result.error) {
      toast.error("거절 실패", { description: result.error });
    } else {
      toast.success("거절 처리되었습니다");
      setDone(true);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700"
        onClick={handleApprove}
        disabled={loading !== null}
      >
        {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
        onClick={handleReject}
        disabled={loading !== null}
      >
        {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

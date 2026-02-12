"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteJobPosting } from "./actions";
import { toast } from "sonner";

export function DeleteJobButton({ postingId }: { postingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;

    setLoading(true);
    const result = await deleteJobPosting(postingId);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("일정이 삭제되었습니다.");
      router.refresh();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

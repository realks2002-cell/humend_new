"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonth } from "@/lib/utils/format";

interface Props {
  currentMonth: string;
  basePath: string;
  compact?: boolean;
}

export function MonthSelector({ currentMonth, basePath, compact }: Props) {
  const router = useRouter();
  const [year, month] = currentMonth.split("-").map(Number);

  function navigate(offset: number) {
    const d = new Date(year, month - 1 + offset, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`${basePath}?month=${m}`);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {`${month}월`}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[120px] text-center font-medium">
        {formatMonth(currentMonth)}
      </span>
      <Button variant="outline" size="icon" onClick={() => navigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonth } from "@/lib/utils/format";

interface Props {
  currentMonth: string;
  basePath: string;
}

export function MonthSelector({ currentMonth, basePath }: Props) {
  const router = useRouter();
  const [year, month] = currentMonth.split("-").map(Number);

  function navigate(offset: number) {
    const d = new Date(year, month - 1 + offset, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`${basePath}?month=${m}`);
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

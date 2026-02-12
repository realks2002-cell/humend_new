"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, X } from "lucide-react";

export function JobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const hasFilters = !!(from || to);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/jobs?${params.toString()}`);
  };

  const clearFilters = () => {
    setFrom("");
    setTo("");
    router.push("/jobs");
  };

  return (
    <div className="mb-6 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[130px]">
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" />
            시작일
          </label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="min-w-[130px]">
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" />
            종료일
          </label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-9" onClick={applyFilters}>
          검색
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            초기화
          </Button>
        )}
      </div>
    </div>
  );
}

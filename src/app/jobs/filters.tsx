"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, X } from "lucide-react";

interface JobFiltersProps {
  clientNames: { id: string; name: string }[];
}

export function JobFilters({ clientNames }: JobFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [clientId, setClientId] = useState(searchParams.get("client") ?? "");

  const hasFilters = !!(from || to || clientId);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (clientId) params.set("client", clientId);
    router.push(`/jobs?${params.toString()}`);
  };

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setClientId("");
    router.push("/jobs");
  };

  return (
    <div className="mb-6 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px]">
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground">
            <MapPin className="h-3 w-3" />
            근무지명
          </label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              {clientNames.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[130px]">
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground">
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
          <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground">
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

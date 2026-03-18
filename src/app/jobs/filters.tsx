"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, X, Search } from "lucide-react";

interface JobFiltersProps {
  clientNames: { id: string; name: string }[];
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function JobFilters({ clientNames }: JobFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [clientId, setClientId] = useState(searchParams.get("client") ?? "");
  const [isNative, setIsNative] = useState(false);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const cap = (window as unknown as Record<string, unknown>).Capacitor as { isNativePlatform?: () => boolean } | undefined;
      setIsNative(cap?.isNativePlatform?.() ?? false);
    } catch {}
  }, []);

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
    <div className={`mb-6 flex items-center gap-1.5 ${isNative ? "w-full" : "w-[60%]"}`}>
      <Select value={clientId} onValueChange={setClientId}>
        <SelectTrigger className="h-9 flex-[1.4] min-w-0 text-xs px-2">
          <SelectValue placeholder="근무지" />
        </SelectTrigger>
        <SelectContent>
          {clientNames.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 시작일 */}
      <div className="relative flex-1 min-w-0">
        <input
          ref={fromRef}
          type="date"
          className="absolute opacity-0 w-0 h-0"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full gap-1 text-xs px-2"
          onClick={() => fromRef.current?.showPicker()}
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {from ? formatDateShort(from) : "시작"}
        </Button>
      </div>

      <span className="text-xs text-muted-foreground shrink-0">~</span>

      {/* 종료일 */}
      <div className="relative flex-1 min-w-0">
        <input
          ref={toRef}
          type="date"
          className="absolute opacity-0 w-0 h-0"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full gap-1 text-xs px-2"
          onClick={() => toRef.current?.showPicker()}
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {to ? formatDateShort(to) : "종료"}
        </Button>
      </div>

      <Button
        size="sm"
        className="h-9 shrink-0 px-2.5 bg-[#A91D3A] hover:bg-[#8E1830] text-white"
        onClick={applyFilters}
      >
        <Search className="h-3.5 w-3.5" />
      </Button>
      {hasFilters && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

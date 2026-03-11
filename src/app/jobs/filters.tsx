"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface JobFiltersProps {
  clientNames: { id: string; name: string }[];
}

export function JobFilters({ clientNames }: JobFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [clientId, setClientId] = useState(searchParams.get("client") ?? "");
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    try {
      const { Capacitor } = require("@capacitor/core");
      setIsNative(Capacitor.isNativePlatform());
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
    <div className="mb-6 flex items-center gap-2">
      <Select value={clientId} onValueChange={setClientId}>
        <SelectTrigger className="h-9 w-0 min-w-[90px] flex-1 text-sm">
          <SelectValue placeholder="근무지 전체" />
        </SelectTrigger>
        <SelectContent>
          {clientNames.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        className="h-9 w-0 min-w-[99px] flex-1 text-sm"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <span className="text-sm text-muted-foreground shrink-0">~</span>
      <Input
        type="date"
        className="h-9 w-0 min-w-[99px] flex-1 text-sm"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <Button
        size="sm"
        className={`h-9 shrink-0 ${isNative ? "bg-red-400 hover:bg-red-500 text-white" : ""}`}
        onClick={applyFilters}
      >
        검색
      </Button>
      {hasFilters && (
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={clearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { DraggableClientList } from "./client-list";

interface ClientTabsProps {
  dailyClients: Array<Record<string, unknown>>;
  fixedTermClients: Array<Record<string, unknown>>;
  dailyCount: number;
  fixedTermCount: number;
}

export function ClientTabs({ dailyClients, fixedTermClients, dailyCount, fixedTermCount }: ClientTabsProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "fixed_term">("daily");

  const clients = activeTab === "daily" ? dailyClients : fixedTermClients;

  return (
    <>
      <div className="flex rounded-lg border p-1 w-fit">
        <button
          onClick={() => setActiveTab("daily")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "daily"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          일별 고객사
          <Badge
            className={`ml-1 text-[10px] h-5 min-w-5 justify-center border-0 ${
              activeTab === "daily"
                ? "bg-white/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {dailyCount}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("fixed_term")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "fixed_term"
              ? "bg-violet-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          기간제 고객사
          <Badge
            className={`ml-1 text-[10px] h-5 min-w-5 justify-center border-0 ${
              activeTab === "fixed_term"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {fixedTermCount}
          </Badge>
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border bg-card py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-medium">
            {activeTab === "daily" ? "등록된 일별 고객사가 없습니다." : "등록된 기간제 고객사가 없습니다."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">위의 버튼으로 고객사를 등록하세요.</p>
        </div>
      ) : (
        <DraggableClientList clients={clients as never[]} />
      )}
    </>
  );
}

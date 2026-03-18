"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "daily", label: "시급제" },
  { value: "fixed_term", label: "기간제" },
];

export function JobTabs({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  const [active, setActive] = useState("daily");

  return (
    <>
      <div className="flex gap-2 mb-[50px] -mt-[10px]">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActive(tab.value)}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors",
              active === tab.value
                ? "bg-[#A91D3A] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={active === "daily" ? "" : "hidden"}>{children[0]}</div>
      <div className={active === "fixed_term" ? "" : "hidden"}>{children[1]}</div>
    </>
  );
}

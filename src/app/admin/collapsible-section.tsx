"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

export function CollapsibleSection({
  children,
  label = "카드",
  defaultOpen = true,
}: {
  children: React.ReactNode;
  label?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div className="flex justify-end mb-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <>
              {label} 최소화 <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              {label} 펼치기 <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

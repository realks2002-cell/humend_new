'use client';

import { usePathname, useRouter } from "next/navigation";
import { Briefcase, ClipboardList, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/jobs", label: "채용공고", icon: Briefcase },
  { href: "/my/applications", label: "지원내역", icon: ClipboardList },
  { href: "/my", label: "마이페이지", icon: User },
  { href: "/signup", label: "회원가입", icon: UserPlus },
] as const;

function isActive(pathname: string, tab: typeof tabs[number]) {
  if (tab.href === "/my") {
    return pathname === "/my" || (pathname.startsWith("/my/") && !pathname.startsWith("/my/applications"));
  }
  return pathname.startsWith(tab.href);
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background"
      style={{ paddingBottom: "48px" }}
    >
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => {
                if (!active) router.push(tab.href);
              }}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] transition-all active:scale-95 active:opacity-70",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
              <span className={cn("leading-tight", active && "font-semibold")}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

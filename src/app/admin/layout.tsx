"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  Megaphone,
  ClipboardList,
  Wallet,
  FileSignature,
  Banknote,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Settings,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/members", label: "회원 관리", icon: Users },
  { href: "/admin/clients", label: "고객사 관리", icon: Building2 },
  { href: "/admin/jobs", label: "공고 관리", icon: Megaphone },
  { href: "/admin/applications", label: "지원 관리", icon: ClipboardList },
  { href: "/admin/payroll", label: "급여 관리", icon: Wallet },
  { href: "/admin/payments", label: "급여지급 내역", icon: Banknote },
  { href: "/admin/contracts", label: "계약 관리", icon: FileSignature },
  { href: "/admin/notifications", label: "알림 관리", icon: Bell },
  { href: "/admin/settings", label: "관리자 설정", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-gradient-to-b from-slate-50/80 to-white transition-all duration-200 md:block",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              관리자
            </p>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="space-y-1 px-2">
          {sidebarLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/admin" && pathname.startsWith(link.href));

              if (collapsed) {
                return (
                  <Tooltip key={link.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center justify-center rounded-xl p-2.5 transition-all",
                          isActive
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <link.icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {link.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
        </nav>
      </aside>

      {/* Mobile Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-lg md:hidden">
        <nav className="flex justify-around py-1.5">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-xs transition-colors",
                      isActive ? "text-blue-600" : "text-muted-foreground"
                    )}
                  >
                    <link.icon className={cn("h-5 w-5", isActive && "drop-shadow-sm")} />
                    <span className="truncate text-[10px] font-medium">{link.label.replace(" 관리", "")}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {link.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, User, Briefcase, Wallet, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/chat") return pathname.startsWith("/chat");
  if (href === "/my/salary") return pathname.startsWith("/my/salary");
  if (href === "/my") return pathname === "/my" || (pathname.startsWith("/my/") && !pathname.startsWith("/my/salary"));
  return pathname.startsWith(href);
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const checkMember = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: member } = await supabase
          .from("members")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();
        setIsMember(!!member);
      } else {
        setIsMember(false);
      }
    };

    checkMember();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMember();
    });

    return () => subscription.unsubscribe();
  }, []);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleHomeLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    }, 5000);
  }, [router]);

  const tabs = [
    { href: "/", label: "홈", icon: Home },
    { href: "/jobs", label: "채용공고", icon: Briefcase },
    // { href: isMember ? "/chat" : "/login", label: "채팅", icon: MessageCircle }, // TODO: 채팅 기능 배포 시 활성화
    { href: isMember ? "/my/salary" : "/login", label: "급여신청", icon: Wallet },
    { href: "/my", label: "마이페이지", icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background"
      style={{ paddingBottom: "48px" }}
    >
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => {
                if (!active) router.push(tab.href);
              }}
              {...(tab.href === "/" ? {
                onTouchStart: handleHomeLongPress,
                onTouchEnd: clearLongPress,
                onTouchCancel: clearLongPress,
              } : {})}
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

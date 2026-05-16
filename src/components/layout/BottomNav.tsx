'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, User, Briefcase, Wallet, MessageCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/capacitor/native";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/chat") return pathname.startsWith("/chat");
  if (href === "/my/salary") return pathname.startsWith("/my/salary");
  if (href === "/my") return pathname === "/my" || (pathname.startsWith("/my/") && !pathname.startsWith("/my/salary"));
  return pathname.startsWith(href);
}

const LOCATION_SETTINGS_HREF = "__location_settings__";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMember, setIsMember] = useState(false);
  const [needLocationPerm, setNeedLocationPerm] = useState(false);

  useEffect(() => {
    if (!isNative()) return;

    let mounted = true;
    const checkLocationPerm = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        const platform = Capacitor.getPlatform();
        if (platform !== "ios" && platform !== "android") return;

        const { getIosAuthorizationStatus, getAndroidLocationStatus } = await import(
          "@/lib/capacitor/native-geofence"
        );
        const status = platform === "ios"
          ? await getIosAuthorizationStatus()
          : await getAndroidLocationStatus();
        if (!mounted) return;
        // "always" 또는 미결정 상태(notDetermined)면 메뉴 숨김. "whenInUse"/"denied" 등은 표시
        setNeedLocationPerm(status !== null && status !== "always" && status !== "notDetermined");
      } catch {
        // 무시
      }
    };
    checkLocationPerm();

    let removeListener: (() => void) | null = null;
    import("@capacitor/app").then(({ App }) => {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) checkLocationPerm();
      }).then((h) => {
        removeListener = () => h.remove();
      });
    });

    return () => {
      mounted = false;
      removeListener?.();
    };
  }, []);

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
    ...(needLocationPerm
      ? [{ href: LOCATION_SETTINGS_HREF, label: "위치설정", icon: MapPin }]
      : []),
    { href: "/my", label: "마이페이지", icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background"
      style={{ paddingBottom: "48px" }}
    >
      <div className={cn("grid", tabs.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={async () => {
                if (tab.href === LOCATION_SETTINGS_HREF) {
                  const { openAppSettings } = await import("@/lib/capacitor/native-geofence");
                  await openAppSettings();
                  return;
                }
                if (!active || pathname !== tab.href) router.push(tab.href);
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

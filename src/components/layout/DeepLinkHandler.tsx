"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNative } from "@/lib/capacitor/native";
import { createClient } from "@/lib/supabase/client";
import { DEEPLINK_TARGETS, resolveAppDeepLink } from "@/lib/deeplink";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const FIRST_LAUNCH_KEY = "deeplink_first_launch_checked";
const PENDING_KEY = "deeplink_pending";
const PENDING_TTL_MS = 60 * 60 * 1000;

// 알림톡 딥링크(com.humend.hr://go/...) 처리 + 설치 후 첫 실행 디퍼드 딥링크.
// 로그인이 필요하면 경로를 보관했다가 로그인 완료(SIGNED_IN) 시 이동 — 로그인 화면 코드는 건드리지 않음
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;
    const supabase = createClient();
    const cleanups: Array<() => void> = [];

    const navigate = async (path: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) localStorage.setItem(PENDING_KEY, JSON.stringify({ path, at: Date.now() }));
      router.push(path);
    };

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN") return;
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      localStorage.removeItem(PENDING_KEY);
      try {
        const { path, at } = JSON.parse(raw) as { path: string; at: number };
        if (Date.now() - at < PENDING_TTL_MS && Object.values(DEEPLINK_TARGETS).includes(path)) router.push(path);
      } catch {
        // 손상된 값은 무시
      }
    });
    cleanups.push(() => authSub.subscription.unsubscribe());

    (async () => {
      const { App } = await import("@capacitor/app");
      const listener = await App.addListener("appUrlOpen", ({ url }) => {
        const path = resolveAppDeepLink(url);
        if (path) void navigate(path);
      });
      cleanups.push(() => void listener.remove());

      const launchPath = resolveAppDeepLink((await App.getLaunchUrl())?.url ?? "");
      const firstLaunch = !localStorage.getItem(FIRST_LAUNCH_KEY);
      localStorage.setItem(FIRST_LAUNCH_KEY, "1");
      if (launchPath) return navigate(launchPath);

      // 설치 후 첫 실행 1회: 스토어 가기 전 누른 딥링크가 있으면 그 화면으로
      if (firstLaunch) {
        const res = await fetch(`${API_BASE}/api/deeplink/claim`, { method: "POST" });
        const { path } = (await res.json()) as { path: string | null };
        if (path && Object.values(DEEPLINK_TARGETS).includes(path)) await navigate(path);
      }
    })().catch((e) => console.warn("[deeplink]", e));

    return () => cleanups.forEach((fn) => fn());
  }, [router]);

  return null;
}

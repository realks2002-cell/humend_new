import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let nativeClient: ReturnType<typeof createSupabaseClient> | null = null;

function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Capacitor injects this on native platforms
    return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export function createClient() {
  if (isNativePlatform()) {
    // 네이티브 앱: localStorage 기반 세션 (앱 종료 후에도 유지)
    if (!nativeClient) {
      nativeClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            storage: typeof window !== "undefined" ? window.localStorage : undefined,
            autoRefreshToken: true,
            persistSession: true,
          },
        }
      );
    }
    return nativeClient;
  }

  // 웹: 쿠키 기반 세션 (SSR/미들웨어 호환)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

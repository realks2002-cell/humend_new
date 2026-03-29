import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let nativeClient: ReturnType<typeof createSupabaseClient> | null = null;

function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  // 1) 빌드 시 환경변수로 강제 설정
  if (process.env.NEXT_PUBLIC_IS_NATIVE_APP === "true") return true;
  // 2) Capacitor 런타임 감지
  try {
    if ((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()) return true;
  } catch {}
  // 3) 정적 빌드 감지: capacitor:// 또는 file:// origin
  try {
    const origin = window.location.origin;
    if (origin.startsWith("capacitor://") || origin.startsWith("file://") || origin === "null") return true;
  } catch {}
  return false;
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

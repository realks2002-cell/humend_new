import { isNative, getPlatform } from "@/lib/capacitor/native";
import { createClient } from "@/lib/supabase/client";

/**
 * 로그인 직후 호출 — FCM 토큰 등록 + 지오펜싱 시작
 * Supabase 세션이 확실히 있는 시점에서 호출해야 함
 */
export async function onLoginComplete() {
  if (!isNative()) return;

  // 1. 푸시 토큰 등록
  try {
    const { registerPush, sendTokenToServer } = await import("@/lib/capacitor/push");

    const token = await registerPush();
    if (token) {
      const platform = getPlatform();
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        const result = await sendTokenToServer(token, platform, session.access_token);
        console.log("[onLogin] 푸시 토큰:", result === true ? "성공" : "실패");
      }
    }
  } catch (e) {
    console.error("[onLogin] 푸시 토큰 에러:", e);
  }

  // 2. 네이티브 저장소에 토큰 저장 (백그라운드 nearby API 호출용)
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const { setNativeAuthToken } = await import("@/lib/capacitor/native-geofence");
      await setNativeAuthToken(session.access_token);
      console.log("[onLogin] 네이티브 토큰 저장 완료");

      // 3. 지오펜싱 시작
      const { checkAndStartGeofence } = await import("@/hooks/useAttendance");
      await checkAndStartGeofence(session.access_token);
    }
  } catch (e) {
    console.error("[onLogin] 지오펜싱 에러:", e);
  }
}

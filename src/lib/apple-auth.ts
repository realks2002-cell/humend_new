/**
 * Capacitor 네이티브 Apple Auth 헬퍼
 *
 * - iOS: @capgo/capacitor-social-login 으로 네이티브 Apple 로그인 → identityToken 반환
 * - Android/웹: null 반환 (Apple 로그인은 iOS 전용)
 */

export interface NativeAppleUser {
  idToken: string;
  email: string;
  name: string;
}

export async function nativeAppleSignIn(): Promise<NativeAppleUser | null> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    if (Capacitor.getPlatform() !== "ios") return null;

    const { SocialLogin } = await import("@capgo/capacitor-social-login");

    await SocialLogin.initialize({ apple: {} });

    const res = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["email", "name"] },
    });

    console.log("[nativeAppleSignIn] login result:", JSON.stringify(res));

    const result = res?.result;
    const idToken =
      (result as { identityToken?: string })?.identityToken ||
      (result as { idToken?: string })?.idToken;

    if (!idToken) {
      console.warn("[nativeAppleSignIn] idToken 없음, result:", JSON.stringify(result));
      return null;
    }

    const profile = (result as { profile?: { email?: string; name?: string; givenName?: string; familyName?: string } })?.profile;
    const name = profile?.name || [profile?.familyName, profile?.givenName].filter(Boolean).join("") || "";

    return {
      idToken,
      email: profile?.email || "",
      name,
    };
  } catch (err) {
    console.error("[nativeAppleSignIn] 에러:", err);
    return null;
  }
}

export async function isIOSPlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

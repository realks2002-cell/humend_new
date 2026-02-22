/**
 * Capacitor 네이티브 Google Auth 헬퍼
 *
 * - 네이티브 (Android/iOS): GoogleAuth 플러그인으로 네이티브 로그인 → idToken 반환
 * - 웹: null 반환 (웹은 기존 signInWithOAuth PKCE 플로우 사용)
 */

export interface NativeGoogleUser {
  idToken: string;
  email: string;
  name: string;
}

/**
 * 네이티브 환경에서 Google 로그인을 시도합니다.
 * 웹 환경이면 null을 반환합니다.
 */
export async function nativeGoogleSignIn(): Promise<NativeGoogleUser | null> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;

    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

    // Android 네이티브에서는 initialize() 불필요, 웹에서만 호출
    if (Capacitor.getPlatform() === 'web') {
      await GoogleAuth.initialize();
    }

    const result = await GoogleAuth.signIn();

    const idToken = result?.authentication?.idToken;
    if (!idToken) {
      console.error('[nativeGoogleSignIn] idToken 없음, result:', JSON.stringify(result));
      return null; // 웹 PKCE로 fallback
    }

    return {
      idToken,
      email: result.email || '',
      name: result.name || result.givenName || '',
    };
  } catch (err) {
    console.error('[nativeGoogleSignIn] 에러:', err);
    return null; // 에러 시 웹 PKCE로 fallback (re-throw 하지 않음)
  }
}

/**
 * Capacitor 네이티브 플랫폼인지 확인합니다.
 */
export async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

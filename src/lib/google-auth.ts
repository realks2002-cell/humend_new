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

    // 플러그인 초기화 (웹에서만 필요하지만, 안전하게 호출)
    await GoogleAuth.initialize();

    const result = await GoogleAuth.signIn();

    if (!result.authentication?.idToken) {
      throw new Error('Google 로그인에서 idToken을 받지 못했습니다.');
    }

    return {
      idToken: result.authentication.idToken,
      email: result.email || '',
      name: result.name || result.givenName || '',
    };
  } catch (err: unknown) {
    // Capacitor 미설치 (웹 환경)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not implemented') || msg.includes('not available')) {
      return null;
    }
    throw err;
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

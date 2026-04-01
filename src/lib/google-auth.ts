/**
 * Capacitor 네이티브 Google Auth 헬퍼
 *
 * - 네이티브 (Android/iOS): @capgo/capacitor-social-login 으로 네이티브 로그인 → idToken 반환
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

    const { SocialLogin } = await import('@capgo/capacitor-social-login');

    await SocialLogin.initialize({
      google: {
        webClientId: '133410524921-94i1t8skrfkfggmrpdhnfkclh9h8o4bv.apps.googleusercontent.com',
        iOSClientId: '153271647846-8kvvkvqnvr1frrts9lqau817cifrtiu3.apps.googleusercontent.com',
        iOSServerClientId: '153271647846-8kvvkvqnvr1frrts9lqau817cifrtiu3.apps.googleusercontent.com',
      },
    });

    const res = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
      },
    });

    console.log('[nativeGoogleSignIn] login result:', JSON.stringify(res));

    const result = res?.result;
    const idToken = (result as { idToken?: string })?.idToken;
    if (!idToken) {
      console.warn('[nativeGoogleSignIn] idToken 없음, result:', JSON.stringify(result));
      return null;
    }

    const profile = (result as { profile?: { email?: string; name?: string; givenName?: string } })?.profile;

    return {
      idToken,
      email: profile?.email || '',
      name: profile?.name || profile?.givenName || '',
    };
  } catch (err) {
    console.error('[nativeGoogleSignIn] 에러:', err);
    return null;
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

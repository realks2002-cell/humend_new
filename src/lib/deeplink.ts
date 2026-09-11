// 알림톡 딥링크 공통 설정 — 웹 연결 페이지(/go/[target])와 앱 핸들러가 함께 사용
// 링크: https://humendhr.com/go/<target>  →  앱: com.humend.hr://go/<target>

export const APP_SCHEME = "com.humend.hr";
export const ANDROID_PACKAGE = "com.humend.hr";
export const APP_STORE_URL = "https://apps.apple.com/kr/app/id6761329910";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

// 허용된 딥링크 대상만 이동 (임의 경로 이동 방지)
export const DEEPLINK_TARGETS: Record<string, string> = {
  salary: "/my/salary",
};

// com.humend.hr://go/salary → "/my/salary", 알 수 없는 링크는 null
export function resolveAppDeepLink(url: string): string | null {
  const m = url.match(/^com\.humend\.hr:\/\/go\/([a-z0-9-]+)/i);
  return m ? DEEPLINK_TARGETS[m[1].toLowerCase()] ?? null : null;
}

// 알림톡 딥링크 연결 페이지 — https://humendhr.com/go/<target> (next.config rewrite → 이 route)
// 앱 설치: 앱의 해당 화면으로 열기 / 미설치: 폰 종류별 스토어로 이동 / 설치 후 첫 실행 시 원래 화면(디퍼드, /api/deeplink/claim)
// api 폴더라 앱 정적 빌드에서는 제외됨
import { createAdminClient } from "@/lib/supabase/server";
import { ANDROID_PACKAGE, APP_SCHEME, APP_STORE_URL, DEEPLINK_TARGETS, PLAY_STORE_URL } from "@/lib/deeplink";

export const dynamic = "force-dynamic";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
}

export async function GET(req: Request, { params }: { params: Promise<{ target: string }> }) {
  const { target: rawTarget } = await params;
  const target = rawTarget.toLowerCase();
  if (!DEEPLINK_TARGETS[target]) return new Response("Not found", { status: 404 });

  const ua = req.headers.get("user-agent") ?? "";
  const platform = /android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : "other";

  const ip = clientIp(req);
  if (ip && platform !== "other") {
    const { error } = await createAdminClient().from("deeplink_clicks").insert({ ip, target, platform });
    if (error) console.error("[deeplink] click 기록 실패:", error.message);
  }

  const appUrl = `${APP_SCHEME}://go/${target}`;
  const androidIntent = `intent://go/${target}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
  const script =
    platform === "android"
      ? `location.replace(${JSON.stringify(androidIntent)});`
      : platform === "ios"
        ? `location.href = ${JSON.stringify(appUrl)};
           setTimeout(function () { if (!document.hidden) location.href = ${JSON.stringify(APP_STORE_URL)}; }, 1500);`
        : "";

  const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>휴멘드에이치알 앱 열기</title>
<style>
  body{margin:0;font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;background:#F5F5F5;color:#091413;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .box{background:#fff;border:1px solid #D7D7D7;border-radius:12px;padding:32px 24px;max-width:320px;width:calc(100% - 48px);text-align:center}
  h1{font-size:20px;margin:0 0 8px} p{font-size:14px;color:#555;margin:0 0 24px;line-height:1.5}
  a{display:block;padding:12px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;margin-top:8px}
  .primary{background:#447D9B;color:#fff} .ghost{border:1px solid #D7D7D7;color:#273F4F}
</style></head>
<body><div class="box">
  <h1>휴멘드에이치알</h1>
  <p>앱이 열리지 않으면 아래 버튼을 눌러 주세요.</p>
  ${platform !== "other" ? `<a class="primary" href="${platform === "android" ? androidIntent.replace(/&/g, "&amp;") : appUrl}">앱에서 열기</a>` : ""}
  ${platform !== "android" ? `<a class="ghost" href="${APP_STORE_URL}">App Store에서 설치</a>` : ""}
  ${platform !== "ios" ? `<a class="ghost" href="${PLAY_STORE_URL}">Google Play에서 설치</a>` : ""}
</div>
<script>${script}</script>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

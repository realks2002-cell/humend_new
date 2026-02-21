import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse(renderErrorPage("인증 코드가 없습니다."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // code → session 교환
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback/app] exchangeCodeForSession error:", error.message);
    return new NextResponse(renderErrorPage("인증에 실패했습니다. 앱에서 다시 시도해주세요."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 세션 및 유저 정보 획득
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  if (!session || !user) {
    return new NextResponse(renderErrorPage("세션을 가져올 수 없습니다."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // members 테이블 존재 확인 → 리다이렉트 경로 결정
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const redirectPath = member ? "/my" : "/signup/complete";

  // 딥링크 URL 생성
  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    redirect: redirectPath,
  });
  const deepLink = `com.humend.hr://auth/callback?${params.toString()}`;

  // HTML 페이지 반환 (302 리다이렉트 대신 JS로 딥링크 열기)
  return new NextResponse(renderDeepLinkPage(deepLink, origin), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderDeepLinkPage(deepLink: string, origin: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Humend HR - 앱으로 이동 중</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #f8fafc; color: #1e293b;
    }
    .container {
      text-align: center; padding: 2rem; max-width: 400px;
    }
    .spinner {
      width: 40px; height: 40px; margin: 0 auto 1.5rem;
      border: 3px solid #e2e8f0; border-top-color: #3b82f6;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem; }
    .btn {
      display: inline-block; padding: 0.75rem 2rem;
      background: #3b82f6; color: #fff; border: none;
      border-radius: 0.5rem; font-size: 1rem; cursor: pointer;
      text-decoration: none;
    }
    .btn:hover { background: #2563eb; }
    .fallback { display: none; }
    .web-link {
      display: block; margin-top: 1rem;
      font-size: 0.8rem; color: #94a3b8; text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <h1>로그인 완료!</h1>
    <p>앱으로 이동하고 있습니다...</p>
    <div class="fallback" id="fallback">
      <p>자동으로 이동되지 않으면 아래 버튼을 눌러주세요.</p>
      <a class="btn" href="${deepLink}">앱 열기</a>
      <a class="web-link" href="${origin}/my">웹에서 계속하기</a>
    </div>
  </div>
  <script>
    // 딥링크로 앱 열기 시도
    window.location.href = ${JSON.stringify(deepLink)};
    // 2초 후 앱이 안 열리면 폴백 버튼 표시
    setTimeout(function() {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('fallback').style.display = 'block';
    }, 2000);
  </script>
</body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Humend HR - 오류</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #f8fafc; color: #1e293b;
    }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #ef4444; }
    p { font-size: 0.875rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>오류</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

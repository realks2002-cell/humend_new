import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;

  return new NextResponse(renderDeeplinkPage(origin), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderDeeplinkPage(origin: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Humend HR - 로그인 완료</title>
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
    p { font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; }
    .success-icon {
      width: 48px; height: 48px; margin: 0 auto 1rem;
      background: #dcfce7; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem;
    }
    .error { color: #ef4444; }
    .web-link {
      display: inline-block; margin-top: 1rem; padding: 0.75rem 2rem;
      background: #3b82f6; color: #fff; border: none;
      border-radius: 0.5rem; font-size: 1rem; cursor: pointer;
      text-decoration: none;
    }
    .web-link:hover { background: #2563eb; }
    .debug { margin-top: 1.5rem; font-size: 0.7rem; color: #94a3b8; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <h1 id="title">처리 중...</h1>
    <p id="message">잠시만 기다려주세요.</p>
    <div id="result" style="display:none;"></div>
    <div class="debug" id="debug"></div>
  </div>
  <script>
    (function() {
      var debugEl = document.getElementById('debug');

      // URL hash fragment에서 토큰 파싱
      var hash = window.location.hash.substring(1);
      if (!hash) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = '오류';
        document.getElementById('title').classList.add('error');
        document.getElementById('message').textContent = '인증 정보가 없습니다. 앱에서 다시 시도해주세요.';
        debugEl.textContent = 'hash: (empty)';
        return;
      }

      var params = new URLSearchParams(hash);
      var accessToken = params.get('access_token');
      var refreshToken = params.get('refresh_token') || '';

      if (!accessToken) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = '오류';
        document.getElementById('title').classList.add('error');
        document.getElementById('message').textContent = '토큰을 가져올 수 없습니다. 앱에서 다시 시도해주세요.';
        debugEl.textContent = 'hash keys: ' + Array.from(params.keys()).join(', ');
        return;
      }

      // 딥링크로 앱에 토큰 전달
      var deeplink = 'com.humend.hr://auth/callback?access_token=' + encodeURIComponent(accessToken)
        + '&refresh_token=' + encodeURIComponent(refreshToken);

      debugEl.textContent = 'token: OK | redirecting via deeplink...';

      // 딥링크 시도
      window.location.href = deeplink;

      // 딥링크 성공 시 이 페이지는 닫힘. 실패 시 (웹 브라우저에서 열린 경우) fallback 표시
      setTimeout(function() {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = '로그인 완료!';
        document.getElementById('message').textContent = '';
        document.getElementById('result').innerHTML =
          '<div class="success-icon">✓</div>' +
          '<p style="color:#16a34a; font-weight:600;">인증이 완료되었습니다.</p>' +
          '<p>앱이 자동으로 열리지 않았다면<br/>앱을 직접 열어주세요.</p>' +
          '<a class="web-link" href="${origin}/my">웹에서 계속하기</a>';
        document.getElementById('result').style.display = 'block';
        debugEl.textContent = 'token: OK | deeplink sent (fallback shown)';
      }, 2000);
    })();
  </script>
</body>
</html>`;
}

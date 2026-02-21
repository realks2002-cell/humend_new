import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
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
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // 현재 유저 확인
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // members 테이블에서 존재 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const source = searchParams.get("source");

  // 앱(WebView)에서 시스템 브라우저로 OAuth 한 경우 → 딥링크로 세션 전달
  if (source === "app") {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const dest = member ? "/my" : "/signup/complete";
      const params = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        redirect: dest,
      });
      return NextResponse.redirect(
        `com.humend.hr://auth/callback?${params.toString()}`
      );
    }
  }

  // 웹 브라우저: 일반 리다이렉트
  if (member) {
    // 기존 회원 → 마이페이지로
    const redirectUrl = new URL("/my", origin);
    const response = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  } else {
    // 신규 구글 회원 → 추가 정보 입력
    const redirectUrl = new URL("/signup/complete", origin);
    const response = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    return response;
  }
}

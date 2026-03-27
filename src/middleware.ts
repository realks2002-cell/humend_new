import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Supabase 환경변수 미설정 시 미들웨어 스킵
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // OAuth PKCE: /?code=xxx → /auth/callback?code=xxx 리다이렉트
  const code = request.nextUrl.searchParams.get('code');
  if (pathname === '/' && code) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  // Auth callback은 PKCE 간섭 방지를 위해 미들웨어 세션 처리 스킵
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // 항상 Supabase 세션 갱신 (토큰 refresh) 수행
  let supabaseResponse = NextResponse.next({ request });

  try {
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

    // getUser() 호출로 토큰 갱신 트리거
    const { data: { user } } = await supabase.auth.getUser();

    // 공개 페이지는 리다이렉트 불필요
    const publicPaths = ["/", "/about", "/jobs", "/login", "/signup", "/signup/complete", "/admin/login", "/privacy", "/terms", "/app"];
    const isPublic =
      publicPaths.includes(pathname) ||
      pathname.startsWith("/jobs/") ||
      pathname.startsWith("/auth/callback");

    if (isPublic) {
      return supabaseResponse;
    }

    // /my/* → 로그인 필요 + members 등록 필요
    if (pathname.startsWith("/my")) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      // 고아 유저 체크: auth에 있지만 members에 없으면 추가정보 입력으로
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!member) {
        const url = request.nextUrl.clone();
        url.pathname = "/signup/complete";
        return NextResponse.redirect(url);
      }
    }

    // /admin/* (로그인 페이지 제외) → 관리자 로그인 필요
    if (pathname.startsWith("/admin")) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }

      const { data: admin } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!admin) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        return NextResponse.redirect(url);
      }
    }

    // 이미 로그인된 사용자가 /login 접근 시 → /my로 리다이렉트
    if (pathname === "/login" && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/my";
      return NextResponse.redirect(url);
    }
  } catch (e) {
    console.error("[middleware] error:", e);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

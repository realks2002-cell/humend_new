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

  // 개발 모드에서는 인증 리다이렉트 스킵 (관리자/회원 동시 접근 허용)
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // 공개 페이지는 인증 불필요 - 바로 통과
  const publicPaths = ["/", "/about", "/jobs", "/login", "/signup", "/admin/login"];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/jobs/");

  if (isPublic) {
    return NextResponse.next();
  }

  // 인증이 필요한 경로만 Supabase 호출
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

    const { data: { user } } = await supabase.auth.getUser();

    // /my/* → 로그인 필요
    if (pathname.startsWith("/my") && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

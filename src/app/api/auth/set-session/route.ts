import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  // JSON 또는 FormData 모두 지원
  let access_token: string | null = null;
  let refresh_token: string | null = null;

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    access_token = body.access_token;
    refresh_token = body.refresh_token;
  } else {
    const formData = await request.formData();
    access_token = formData.get("access_token") as string;
    refresh_token = formData.get("refresh_token") as string;
  }

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // JSON 응답 — Capacitor WebView에서 form.submit()이나 서버 redirect가
  // 시스템 브라우저를 여는 문제 방지. 쿠키만 설정하고 네비게이션은 클라이언트에서 처리.
  const response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.setSession({ access_token, refresh_token });

  return response;
}

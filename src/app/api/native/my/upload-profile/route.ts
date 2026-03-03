import { createAdminClient } from "@/lib/supabase/server";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "사진 파일이 필요합니다." },
        { status: 400 },
      );
    }

    // Vercel Blob에 업로드
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `profile-photos/${user.id}/profile.${ext}`;

    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // DB에 URL 저장 (admin 클라이언트로 RLS 우회)
    const { error: dbError } = await admin
      .from("members")
      .update({ profile_image_url: blob.url })
      .eq("id", user.id);

    if (dbError) {
      return NextResponse.json(
        { error: `DB 업데이트 실패: ${dbError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: `업로드 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      },
      { status: 500 },
    );
  }
}

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return NextResponse.json(
        { error: "사진 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // Vercel Blob에 업로드
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `profile-photos/${user.id}/profile.${ext}`;

    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // DB에 URL 저장
    const { error: dbError } = await supabase
      .from("members")
      .update({ profile_image_url: blob.url })
      .eq("id", user.id);

    if (dbError) {
      return NextResponse.json(
        { error: `DB 업데이트 실패: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: `업로드 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      },
      { status: 500 }
    );
  }
}

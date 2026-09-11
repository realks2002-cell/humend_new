import { createAdminClient } from "@/lib/supabase/server";
import { parseFamilyCertFile, saveFamilyCert, getFamilyCertSignedUrl } from "@/lib/family-cert";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function authenticate(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await getFamilyCertSignedUrl(user.id);
    return NextResponse.json(result, {
      status: result.error ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[family-cert GET]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "가족관계증명서를 불러오지 못했어요." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "사진 파일을 선택해 주세요." }, { status: 400 });
    }

    const file = await parseFamilyCertFile(formData.get("file"));
    if ("error" in file) {
      return NextResponse.json({ error: file.error }, { status: 400 });
    }

    const result = await saveFamilyCert(user.id, file);
    return NextResponse.json(result, {
      status: result.error ? 500 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[family-cert POST]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "업로드에 실패했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}

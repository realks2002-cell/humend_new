import { createAdminClient } from "@/lib/supabase/server";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { guardianName, guardianPhone, guardianRelationship, signatureDataUrl } =
    body as {
      guardianName?: string;
      guardianPhone?: string;
      guardianRelationship?: string;
      signatureDataUrl?: string;
    };

  if (!guardianName || !guardianPhone || !guardianRelationship || !signatureDataUrl) {
    return NextResponse.json(
      { error: "모든 필드를 입력해주세요." },
      { status: 400 },
    );
  }

  // 1. 서명 이미지 Vercel Blob 업로드
  const base64 = signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const fileName = `consent-signatures/${user.id}/signature_${Date.now()}.png`;

  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // 2. 기존 active 동의서 revoked 처리
  await admin
    .from("parental_consents")
    .update({ status: "revoked" })
    .eq("member_id", user.id)
    .eq("status", "active");

  // 3. 새 동의서 저장
  const { error: insertError } = await admin
    .from("parental_consents")
    .insert({
      member_id: user.id,
      guardian_name: guardianName,
      guardian_phone: guardianPhone,
      guardian_relationship: guardianRelationship,
      signature_url: blob.url,
      status: "active",
      consented_at: new Date().toISOString(),
    });

  if (insertError) {
    return NextResponse.json(
      { error: `저장 실패: ${insertError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

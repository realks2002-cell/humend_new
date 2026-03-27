import { createAdminClient } from "@/lib/supabase/server";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, imageDataUrl } = (await req.json()) as {
    date?: string;
    imageDataUrl?: string;
  };

  if (!date || !imageDataUrl) {
    return NextResponse.json({ error: "날짜와 이미지를 모두 제출해주세요." }, { status: 400 });
  }

  const base64 = imageDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const ext = imageDataUrl.startsWith("data:image/png") ? "png" : "jpg";
  const fileName = `health-certs/${user.id}/health_cert_${Date.now()}.${ext}`;

  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: ext === "png" ? "image/png" : "image/jpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const { error } = await admin
    .from("members")
    .update({
      health_cert_date: date,
      health_cert_image_url: blob.url,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await admin
    .from("members")
    .update({
      health_cert_date: null,
      health_cert_image_url: null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: `삭제 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

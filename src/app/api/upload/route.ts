import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ urls: [], error: "파일이 없습니다." });
    }

    const admin = createAdminClient();
    const urls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error } = await admin.storage
        .from("client-images")
        .upload(filePath, buffer, {
          contentType: file.type || "image/jpeg",
        });

      if (error) {
        console.error("[upload] error:", error.message);
        continue;
      }

      const { data: urlData } = admin.storage
        .from("client-images")
        .getPublicUrl(filePath);

      urls.push(urlData.publicUrl);
    }

    return NextResponse.json({ urls, error: null });
  } catch (err) {
    console.error("[upload] unexpected:", err);
    return NextResponse.json({ urls: [], error: "업로드 실패" });
  }
}

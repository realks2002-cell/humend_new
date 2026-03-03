import { createAdminClient } from "@/lib/supabase/server";
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
  const { workRecordId, signatureDataUrl, workInfo } = body as {
    workRecordId?: string;
    signatureDataUrl?: string;
    workInfo?: {
      work_date: string;
      start_time: string;
      end_time: string;
      wage_type?: string;
      daily_wage?: number;
    };
  };

  if (!workRecordId || !signatureDataUrl) {
    return NextResponse.json(
      { error: "workRecordId와 signatureDataUrl은 필수입니다." },
      { status: 400 },
    );
  }

  // data URL → Buffer
  const base64 = signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const fileName = `${user.id}/${workRecordId}_${Date.now()}.png`;

  // Supabase Storage에 업로드
  const { error: uploadError } = await admin.storage
    .from("signatures")
    .upload(fileName, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: `서명 저장 실패: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // work_record 업데이트
  const updateData: Record<string, unknown> = {
    signature_url: fileName,
    signed_at: new Date().toISOString(),
  };

  if (workInfo) {
    updateData.work_date = workInfo.work_date;
    updateData.start_time = workInfo.start_time;
    updateData.end_time = workInfo.end_time;
    updateData.wage_type = workInfo.wage_type ?? "시급";

    if (workInfo.wage_type === "일급" && workInfo.daily_wage) {
      updateData.hourly_wage = Math.round(workInfo.daily_wage / 8);
      updateData.base_pay = workInfo.daily_wage;
    }
  }

  const { error: updateError } = await admin
    .from("work_records")
    .update(updateData)
    .eq("id", workRecordId)
    .eq("member_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: `업데이트 실패: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

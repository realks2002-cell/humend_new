import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Bearer 토큰으로 사용자 인증
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

  // 요청 바디 파싱
  const body = await req.json();
  const { applicationId } = body as { applicationId?: string };
  if (!applicationId) {
    return NextResponse.json(
      { error: "applicationId is required" },
      { status: 400 },
    );
  }

  // 본인의 지원인지 + 상태 확인
  const { data: app, error: fetchError } = await admin
    .from("applications")
    .select("id, member_id, status")
    .eq("id", applicationId)
    .single();

  if (fetchError || !app) {
    return NextResponse.json(
      { error: "지원 내역을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (app.member_id !== user.id) {
    return NextResponse.json(
      { error: "본인의 지원만 취소할 수 있습니다." },
      { status: 403 },
    );
  }

  if (app.status !== "대기" && app.status !== "승인") {
    return NextResponse.json(
      { error: "대기 또는 승인 상태의 지원만 취소할 수 있습니다." },
      { status: 400 },
    );
  }

  // 승인 상태인 경우 연관된 work_records/payments 삭제
  if (app.status === "승인") {
    const { data: workRecords } = await admin
      .from("work_records")
      .select("id")
      .eq("application_id", applicationId);

    if (workRecords && workRecords.length > 0) {
      const wrIds = workRecords.map((r: { id: string }) => r.id);
      await admin.from("payments").delete().in("work_record_id", wrIds);
    }

    await admin
      .from("work_records")
      .delete()
      .eq("application_id", applicationId);
  }

  // 상태를 취소로 변경
  const { error: updateError } = await admin
    .from("applications")
    .update({ status: "취소" })
    .eq("id", applicationId);

  if (updateError) {
    return NextResponse.json(
      { error: "취소 처리에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

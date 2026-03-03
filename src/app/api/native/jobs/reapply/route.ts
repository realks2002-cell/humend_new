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
  const { applicationId } = body as { applicationId?: string };
  if (!applicationId) {
    return NextResponse.json(
      { error: "applicationId is required" },
      { status: 400 },
    );
  }

  // 본인의 지원인지 + 취소 상태 확인
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
      { error: "본인의 지원만 재지원할 수 있습니다." },
      { status: 403 },
    );
  }

  if (app.status !== "취소") {
    return NextResponse.json(
      { error: "취소된 지원만 재지원할 수 있습니다." },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("applications")
    .update({
      status: "대기",
      applied_at: new Date().toISOString(),
      reviewed_at: null,
      admin_memo: null,
    })
    .eq("id", applicationId)
    .select("id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "재지원 처리에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

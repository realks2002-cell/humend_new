import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const { error } = await admin
      .from("parental_consents")
      .update({ status: "revoked" })
      .eq("member_id", user.id)
      .eq("status", "active");

    if (error) {
      console.error("[revoke-consent] update failed:", error.code, error.message);
      return NextResponse.json(
        { error: "철회에 실패했어요. 잠시 후 다시 시도해 주세요." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[revoke-consent]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "철회에 실패했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}

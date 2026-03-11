import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { notifyAdminNoshowConfirmed } from "@/lib/push/location-notify";

/**
 * GET /api/cron/noshow-confirm
 * 매 10분 실행 — 출근시간 + 30분 경과 후 미도착 → 노쇼 확정
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 오늘 아직 도착하지 않은 shift
  const { data: shifts } = await admin
    .from("daily_shifts")
    .select("id, start_time, arrival_status")
    .eq("work_date", today)
    .not("arrival_status", "in", '("arrived","late","noshow")');

  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ confirmed: 0 });
  }

  let confirmed = 0;

  for (const shift of shifts) {
    const shiftStart = new Date(`${today}T${shift.start_time}+09:00`);
    const graceEnd = new Date(shiftStart.getTime() + 30 * 60 * 1000);

    // 출근 시간 + 30분 경과?
    if (now >= graceEnd) {
      // 회원 정보 조회 (알림용)
      const { data: shiftInfo } = await admin
        .from("daily_shifts")
        .select("member_id, clients(company_name), members(name)")
        .eq("id", shift.id)
        .single();

      await admin
        .from("daily_shifts")
        .update({
          arrival_status: "noshow",
          risk_level: 3,
        })
        .eq("id", shift.id);

      // 관리자에게 노쇼 확정 FCM 발송
      if (shiftInfo) {
        const info = shiftInfo as unknown as {
          member_id: string;
          clients: { company_name: string } | null;
          members: { name: string } | null;
        };
        const { data: admins } = await admin
          .from("admins")
          .select("id");
        if (admins) {
          for (const a of admins) {
            await notifyAdminNoshowConfirmed(
              a.id,
              info.members?.name ?? "이름없음",
              info.clients?.company_name ?? "근무지"
            );
          }
        }
      }

      confirmed++;
    }
  }

  return NextResponse.json({ confirmed });
}

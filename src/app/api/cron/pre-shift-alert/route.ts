import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { notifyAppActivation, notifyAppReminder } from "@/lib/push/location-notify";

/**
 * GET /api/cron/pre-shift-alert
 * 매 10분 실행 — 출근 2시간 전부터 앱 활성화 푸시 발송
 * pending 상태이고 last_alert_at이 NULL이거나 20분 이상 경과한 회원 대상
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

  const { data: shifts } = await admin
    .from("daily_shifts")
    .select(`
      id, member_id, start_time, last_alert_at,
      clients (company_name)
    `)
    .eq("work_date", today)
    .in("arrival_status", ["pending"]);

  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ checked: 0, notified: 0 });
  }

  let notified = 0;

  for (const shift of shifts) {
    const shiftStart = new Date(`${today}T${shift.start_time}+09:00`);
    const minutesUntil = (shiftStart.getTime() - now.getTime()) / 60000;

    if (minutesUntil <= 0 || minutesUntil > 120) continue;

    const lastAlert = shift.last_alert_at
      ? new Date(shift.last_alert_at)
      : null;
    const minutesSinceLastAlert = lastAlert
      ? (now.getTime() - lastAlert.getTime()) / 60000
      : Infinity;

    if (minutesSinceLastAlert < 20) continue;

    const companyName =
      (shift.clients as unknown as { company_name: string })?.company_name ??
      "근무지";
    const timeStr = shift.start_time.slice(0, 5);
    const isFirst = !lastAlert;

    if (isFirst) {
      await notifyAppActivation(shift.member_id, companyName, timeStr);
    } else {
      await notifyAppReminder(
        shift.member_id,
        companyName,
        timeStr,
        Math.round(minutesUntil)
      );
    }

    await admin
      .from("daily_shifts")
      .update({ last_alert_at: now.toISOString() })
      .eq("id", shift.id);

    notified++;
  }

  return NextResponse.json({ checked: shifts.length, notified });
}

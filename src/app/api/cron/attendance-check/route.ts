import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  notifyAttendanceCheck,
  notifyNoshowToMember,
  notifyNoshowToAdmin,
  sendLocationCheckPush,
} from "@/lib/push/attendance-notify";

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
      id, member_id, start_time, arrival_status,
      alert_minutes_before, alert_interval_minutes, alert_max_count,
      notification_sent_count, last_notification_at,
      custom_notify_message, custom_repeat_message,
      clients (company_name)
    `)
    .eq("work_date", today)
    .in("arrival_status", ["pending", "notified"]);

  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ checked: 0, notified: 0, noshow: 0 });
  }

  let notifiedCount = 0;
  let noshowCount = 0;

  for (const shift of shifts) {
    const shiftStart = new Date(`${today}T${shift.start_time}+09:00`);
    const minutesUntil = (shiftStart.getTime() - now.getTime()) / 60000;
    const companyName =
      (shift.clients as unknown as { company_name: string })?.company_name ??
      "근무지";
    const timeStr = shift.start_time.slice(0, 5);
    const customNotify = (shift as any).custom_notify_message as string | null;
    const customRepeat = (shift as any).custom_repeat_message as string | null;

    if (shift.arrival_status === "pending") {
      if (minutesUntil <= shift.alert_minutes_before && minutesUntil > 0) {
        await notifyAttendanceCheck(
          shift.member_id,
          shift.id,
          companyName,
          timeStr,
          customNotify || undefined
        );

        await admin
          .from("daily_shifts")
          .update({
            arrival_status: "notified",
            notification_sent_count: 1,
            last_notification_at: now.toISOString(),
          })
          .eq("id", shift.id);

        notifiedCount++;
      }
    } else if (shift.arrival_status === "notified") {
      const lastNotif = shift.last_notification_at
        ? new Date(shift.last_notification_at)
        : null;
      const minutesSinceLast = lastNotif
        ? (now.getTime() - lastNotif.getTime()) / 60000
        : Infinity;

      if (
        shift.notification_sent_count >= shift.alert_max_count &&
        minutesUntil <= 0
      ) {
        await admin
          .from("daily_shifts")
          .update({ arrival_status: "noshow" })
          .eq("id", shift.id);

        const { data: admins } = await admin
          .from("admins")
          .select("id");
        if (admins) {
          const { data: member } = await admin
            .from("members")
            .select("name")
            .eq("id", shift.member_id)
            .single();

          for (const a of admins) {
            notifyNoshowToAdmin(
              a.id,
              member?.name ?? "회원",
              companyName
            ).catch(console.error);
          }
        }

        noshowCount++;
      } else if (
        minutesSinceLast >= shift.alert_interval_minutes - 1 &&
        shift.notification_sent_count < shift.alert_max_count
      ) {
        await notifyAttendanceCheck(
          shift.member_id,
          shift.id,
          companyName,
          timeStr,
          customRepeat || customNotify || undefined
        );

        await admin
          .from("daily_shifts")
          .update({
            notification_sent_count: shift.notification_sent_count + 1,
            last_notification_at: now.toISOString(),
          })
          .eq("id", shift.id);

        notifiedCount++;
      }
    }
  }

  // 2층: approaching_at/nearby_at 미기록 + 미도착 shift에 location_check Silent Push 발송
  const { data: locationPending } = await admin
    .from("daily_shifts")
    .select(`
      id, member_id, start_time, approaching_at, nearby_at,
      clients (latitude, longitude)
    `)
    .eq("work_date", today)
    .in("arrival_status", ["pending", "notified", "confirmed"]);

  let locationCheckCount = 0;
  if (locationPending) {
    for (const s of locationPending) {
      // approaching_at, nearby_at 둘 다 있으면 스킵
      if (s.approaching_at && s.nearby_at) continue;

      const sStart = new Date(`${today}T${s.start_time}+09:00`);
      const mUntil = (sStart.getTime() - now.getTime()) / 60000;
      // approaching_at 미기록: 출근 90분 전부터, nearby_at 미기록: 출근 60분 전부터
      const threshold = !s.approaching_at ? 90 : 60;
      if (mUntil <= threshold && mUntil > -30) {
        const c = s.clients as unknown as { latitude: number | null; longitude: number | null };
        if (c?.latitude && c?.longitude) {
          sendLocationCheckPush(s.member_id, s.id, c.latitude, c.longitude).catch(console.error);
          locationCheckCount++;
        }
      }
    }
  }

  return NextResponse.json({
    checked: shifts.length,
    notified: notifiedCount,
    noshow: noshowCount,
    locationCheck: locationCheckCount,
  });
}

import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { notifyAdminLatePrediction } from "@/lib/push/location-notify";

/**
 * GET /api/cron/late-prediction
 * 매 5분 실행 — 지각 예측 + 관리자 FCM
 * 출근 20분 전, ETA가 출근시간 초과 시 알림
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date()
    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
    .replace(/\. /g, "-")
    .replace(/\./g, "");
  const parts = today.split("-");
  const dateStr = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;

  // 이동 중이거나 추적 중인 shift 조회
  const { data: shifts } = await admin
    .from("daily_shifts")
    .select(`
      id, member_id, client_id, start_time, arrival_status, risk_level,
      last_known_lat, last_known_lng,
      clients (company_name),
      members (name)
    `)
    .eq("work_date", dateStr)
    .in("arrival_status", ["tracking", "moving", "late_risk"]);

  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  const now = new Date();
  let predicted = 0;

  for (const shift of shifts) {
    // 출근까지 남은 시간 계산
    const shiftStart = new Date(`${dateStr}T${shift.start_time}+09:00`);
    const minutesUntil = (shiftStart.getTime() - now.getTime()) / 60000;

    // 출근시간 경과: ETA 없이 바로 late_risk
    if (minutesUntil < 0) {
      if (shift.arrival_status !== "late_risk") {
        await admin
          .from("daily_shifts")
          .update({ arrival_status: "late_risk" })
          .eq("id", shift.id);

        const { data: admins } = await admin.from("admins").select("id");
        if (admins) {
          const memberName = (shift.members as unknown as { name: string })?.name ?? "이름없음";
          const companyName = (shift.clients as unknown as { company_name: string })?.company_name ?? "";
          for (const a of admins) {
            await notifyAdminLatePrediction(a.id, memberName, companyName, 0);
          }
        }
        predicted++;
      }
      continue;
    }

    // 출근 20분 전부터 ETA 기반 예측
    if (minutesUntil > 20) continue;

    // ETA 계산
    const { data: eta } = await admin
      .rpc("calculate_eta", { p_shift_id: shift.id })
      .maybeSingle() as { data: { eta_minutes: number; distance_meters: number; avg_speed_mps: number } | null };

    if (!eta?.eta_minutes) continue;

    // ETA가 남은 시간보다 크면 지각 예측
    if (eta.eta_minutes > minutesUntil) {
      await admin
        .from("daily_shifts")
        .update({ arrival_status: "late_risk" })
        .eq("id", shift.id);

      const { data: admins } = await admin.from("admins").select("id");
      if (admins) {
        const memberName = (shift.members as unknown as { name: string })?.name ?? "이름없음";
        const companyName = (shift.clients as unknown as { company_name: string })?.company_name ?? "";

        for (const a of admins) {
          await notifyAdminLatePrediction(
            a.id,
            memberName,
            companyName,
            eta.eta_minutes
          );
        }
      }
      predicted++;
    }
  }

  return NextResponse.json({ checked: shifts.length, predicted });
}

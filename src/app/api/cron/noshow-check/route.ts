import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  notifyTrackingStart,
  notifyAdminNoshowRisk,
} from "@/lib/push/location-notify";

/**
 * GET /api/cron/noshow-check
 * 매 10분 실행 — 노쇼 위험 감지 + 관리자 FCM
 */
export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 노쇼 위험 감지 함수 호출
  const { data: risks, error } = await admin.rpc("detect_noshow_risk");

  if (error) {
    console.error("noshow-check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!risks || risks.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  let notified = 0;

  for (const risk of risks) {
    // shift 상태 업데이트
    const statusMap: Record<number, string> = {
      1: "noshow_risk",
      2: "noshow_risk",
      3: "noshow_risk",
    };

    await admin
      .from("daily_shifts")
      .update({
        risk_level: risk.new_risk_level,
        arrival_status: statusMap[risk.new_risk_level] ?? "tracking",
      })
      .eq("id", risk.shift_id);

    // 관리자 목록 조회 (모든 단계에서 사용)
    const { data: admins } = await admin
      .from("admins")
      .select("id");

    // 1단계: 회원에게 추적 시작 알림 + 관리자에게도 알림
    if (risk.new_risk_level === 1) {
      await notifyTrackingStart(risk.member_id, risk.company_name);
      if (admins) {
        for (const a of admins) {
          await notifyAdminNoshowRisk(
            a.id,
            risk.member_name ?? "이름없음",
            risk.company_name,
            risk.new_risk_level
          );
        }
      }
      notified++;
    }

    // 2단계: 관리자 알림 + 회원 재알림
    if (risk.new_risk_level === 2) {
      await notifyTrackingStart(risk.member_id, risk.company_name);
      if (admins) {
        for (const a of admins) {
          await notifyAdminNoshowRisk(
            a.id,
            risk.member_name ?? "이름없음",
            risk.company_name,
            risk.new_risk_level
          );
        }
      }
      notified++;
    }

    // 3단계: 관리자 즉시 알림
    if (risk.new_risk_level >= 3) {
      if (admins) {
        for (const a of admins) {
          await notifyAdminNoshowRisk(
            a.id,
            risk.member_name ?? "이름없음",
            risk.company_name,
            risk.new_risk_level
          );
        }
      }
      notified++;
    }
  }

  return NextResponse.json({
    checked: risks.length,
    notified,
  });
}

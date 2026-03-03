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
  const { clientName, workDate, startTime, endTime, wageType, wageAmount, signatureDataUrl } =
    body as {
      clientName?: string;
      workDate?: string;
      startTime?: string;
      endTime?: string;
      wageType?: "시급" | "일급";
      wageAmount?: number;
      signatureDataUrl?: string;
    };

  if (!clientName || !workDate || !startTime || !endTime || !wageType || !wageAmount || !signatureDataUrl) {
    return NextResponse.json(
      { error: "모든 필드를 입력해주세요." },
      { status: 400 },
    );
  }

  // 급여 계산
  const startParts = startTime.split(":").map(Number);
  const endParts = endTime.split(":").map(Number);
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  const totalMinutes =
    endMinutes > startMinutes
      ? endMinutes - startMinutes
      : 24 * 60 - startMinutes + endMinutes;

  const breakMinutes = totalMinutes >= 480 ? 60 : totalMinutes >= 240 ? 30 : 0;
  const workMinutes = totalMinutes - breakMinutes;
  const workHours = Math.round((workMinutes / 60) * 100) / 100;
  const overtimeHours =
    workHours > 8 ? Math.round((workHours - 8) * 100) / 100 : 0;
  const regularHours = workHours - overtimeHours;

  let hourlyWage: number;
  let basePay: number;
  let overtimePay: number;

  if (wageType === "일급") {
    hourlyWage = Math.round(wageAmount / 8);
    basePay = wageAmount;
    overtimePay = Math.round(hourlyWage * 1.5 * overtimeHours);
  } else {
    hourlyWage = wageAmount;
    basePay = Math.round(hourlyWage * regularHours);
    overtimePay = Math.round(hourlyWage * 1.5 * overtimeHours);
  }

  const weeklyHolidayPay = 0;
  const grossPay = basePay + overtimePay + weeklyHolidayPay;

  // 4대보험 공제
  const employmentInsurance = Math.round(grossPay * 0.009);
  const nationalPension = 0;
  const healthInsurance = 0;
  const longTermCare = 0;
  const totalDeduction =
    employmentInsurance + nationalPension + healthInsurance + longTermCare;
  const netPay = grossPay - totalDeduction;

  // work_record 생성
  const { data: record, error: insertError } = await admin
    .from("work_records")
    .insert({
      member_id: user.id,
      posting_id: null,
      application_id: null,
      client_name: clientName,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
      hourly_wage: hourlyWage,
      work_hours: workHours,
      overtime_hours: overtimeHours,
      base_pay: basePay,
      overtime_pay: overtimePay,
      weekly_holiday_pay: weeklyHolidayPay,
      gross_pay: grossPay,
      national_pension: nationalPension,
      health_insurance: healthInsurance,
      long_term_care: longTermCare,
      employment_insurance: employmentInsurance,
      total_deduction: totalDeduction,
      net_pay: netPay,
      wage_type: wageType,
      status: "대기",
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: `근무기록 생성 실패: ${insertError.message}` },
      { status: 500 },
    );
  }

  // 서명 저장
  const base64 = signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const fileName = `${user.id}/${record.id}_${Date.now()}.png`;

  const { error: uploadError } = await admin.storage
    .from("signatures")
    .upload(fileName, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: `서명 저장 실패: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // work_record에 서명 정보 업데이트
  const { error: updateError } = await admin
    .from("work_records")
    .update({
      signature_url: fileName,
      signed_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (updateError) {
    return NextResponse.json(
      { error: `서명 업데이트 실패: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

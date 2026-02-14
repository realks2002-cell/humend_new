"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitSignature(
  workRecordId: string,
  signatureDataUrl: string,
  workInfo?: { work_date: string; start_time: string; end_time: string; wage_type?: string; daily_wage?: number },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();

  // data URL → Blob
  const base64 = signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const fileName = `${user.id}/${workRecordId}_${Date.now()}.png`;

  // Supabase Storage에 업로드 (admin 클라이언트)
  const { error: uploadError } = await admin.storage
    .from("signatures")
    .upload(fileName, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) return { error: `서명 저장 실패: ${uploadError.message}` };

  // work_record 업데이트 (admin 클라이언트)
  const updateData: Record<string, unknown> = {
    signature_url: fileName,
    signed_at: new Date().toISOString(),
  };

  // 회원이 입력한 근무일/시간 반영
  if (workInfo) {
    updateData.work_date = workInfo.work_date;
    updateData.start_time = workInfo.start_time;
    updateData.end_time = workInfo.end_time;
    updateData.wage_type = workInfo.wage_type ?? "시급";

    // 일급인 경우: hourly_wage = daily_wage / 8, base_pay = daily_wage
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

  if (updateError) return { error: `업데이트 실패: ${updateError.message}` };

  revalidatePath("/my/salary");
  revalidatePath("/admin/contracts");
  return { success: true };
}

interface DirectSalaryInput {
  clientName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  wageType: "시급" | "일급";
  wageAmount: number;
  signatureDataUrl: string;
}

export async function submitDirectSalary(input: DirectSalaryInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const admin = createAdminClient();

  // 급여 계산
  const startParts = input.startTime.split(":").map(Number);
  const endParts = input.endTime.split(":").map(Number);
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  const totalMinutes = endMinutes > startMinutes
    ? endMinutes - startMinutes
    : (24 * 60 - startMinutes) + endMinutes;

  // 휴게시간: 8시간 이상 60분, 4시간 이상 30분
  const breakMinutes = totalMinutes >= 480 ? 60 : totalMinutes >= 240 ? 30 : 0;
  const workMinutes = totalMinutes - breakMinutes;
  const workHours = Math.round((workMinutes / 60) * 100) / 100;
  const overtimeHours = workHours > 8 ? Math.round((workHours - 8) * 100) / 100 : 0;
  const regularHours = workHours - overtimeHours;

  let hourlyWage: number;
  let basePay: number;
  let overtimePay: number;

  if (input.wageType === "일급") {
    hourlyWage = Math.round(input.wageAmount / 8);
    basePay = input.wageAmount;
    overtimePay = Math.round(hourlyWage * 1.5 * overtimeHours);
  } else {
    hourlyWage = input.wageAmount;
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
  const totalDeduction = employmentInsurance + nationalPension + healthInsurance + longTermCare;
  const netPay = grossPay - totalDeduction;

  // work_record 생성 (posting_id: null)
  const { data: record, error: insertError } = await admin
    .from("work_records")
    .insert({
      member_id: user.id,
      posting_id: null,
      application_id: null,
      client_name: input.clientName,
      work_date: input.workDate,
      start_time: input.startTime,
      end_time: input.endTime,
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
      wage_type: input.wageType,
      status: "대기",
    })
    .select("id")
    .single();

  if (insertError) return { error: `근무기록 생성 실패: ${insertError.message}` };

  // 서명 저장
  const base64 = input.signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const fileName = `${user.id}/${record.id}_${Date.now()}.png`;

  const { error: uploadError } = await admin.storage
    .from("signatures")
    .upload(fileName, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) return { error: `서명 저장 실패: ${uploadError.message}` };

  // work_record에 서명 정보 업데이트
  const { error: updateError } = await admin
    .from("work_records")
    .update({
      signature_url: fileName,
      signed_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (updateError) return { error: `서명 업데이트 실패: ${updateError.message}` };

  revalidatePath("/my/salary");
  revalidatePath("/admin/contracts");
  return { success: true };
}

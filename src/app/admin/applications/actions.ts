"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { calculateWorkHours, calculateFullSalary } from "@/lib/utils/salary";
import { revalidatePath } from "next/cache";

export async function approveApplication(applicationId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("applications")
    .update({ status: "승인", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  await createWorkRecordFromApproval(applicationId);

  revalidatePath("/admin/applications");
  revalidatePath("/admin/payroll");
  return { error: null };
}

export async function rejectApplication(applicationId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("applications")
    .update({ status: "거절", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  revalidatePath("/admin/applications");
  return { error: error?.message ?? null };
}

async function createWorkRecordFromApproval(applicationId: string) {
  const supabase = createAdminClient();

  // application + job_posting + client 데이터 조인
  const { data: app } = await supabase
    .from("applications")
    .select(`
      id,
      member_id,
      posting_id,
      job_postings (
        id,
        work_date,
        start_time,
        end_time,
        clients (
          company_name,
          hourly_wage
        )
      )
    `)
    .eq("id", applicationId)
    .single();

  if (!app?.job_postings) return;

  const posting = app.job_postings as unknown as {
    id: string;
    work_date: string;
    start_time: string;
    end_time: string;
    clients: { company_name: string; hourly_wage: number };
  };

  const client = posting.clients;

  // 근무시간 계산 (8시간 초과 시 30분 휴게)
  const totalRaw = calculateWorkHours({
    startTime: posting.start_time,
    endTime: posting.end_time,
  });
  const breakMinutes = totalRaw.totalHours > 8 ? 30 : 0;

  const hours = calculateWorkHours({
    startTime: posting.start_time,
    endTime: posting.end_time,
    breakMinutes,
  });

  // 급여 계산
  const salary = calculateFullSalary({
    hourlyWage: client.hourly_wage,
    workHours: hours.workHours,
    overtimeHours: hours.overtimeHours,
  });

  await supabase.from("work_records").insert({
    member_id: app.member_id,
    posting_id: posting.id,
    application_id: app.id,
    client_name: client.company_name,
    work_date: posting.work_date,
    start_time: posting.start_time,
    end_time: posting.end_time,
    break_minutes: breakMinutes,
    hourly_wage: client.hourly_wage,
    work_hours: salary.workHours,
    overtime_hours: salary.overtimeHours,
    base_pay: salary.basePay,
    overtime_pay: salary.overtimePay,
    weekly_holiday_pay: salary.weeklyHolidayPay,
    gross_pay: salary.grossPay,
    national_pension: salary.nationalPension,
    health_insurance: salary.healthInsurance,
    long_term_care: salary.longTermCare,
    employment_insurance: salary.employmentInsurance,
    total_deduction: salary.totalDeduction,
    net_pay: salary.netPay,
    status: "대기",
    signature_url: null,
    contract_pdf_url: null,
    signed_at: null,
    admin_memo: null,
  });
}

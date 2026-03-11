"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { calculateWorkHours, calculateFullSalary } from "@/lib/utils/salary";
import { getWorkDatesInRange } from "@/lib/utils/date";
import { revalidatePath } from "next/cache";
import { notifyApplicationApproved, notifyApplicationRejected } from "@/lib/push/notify";

async function getHeadcountStatus(postingId: string) {
  const supabase = createAdminClient();
  const { data: posting } = await supabase
    .from("job_postings").select("headcount").eq("id", postingId).single();
  const headcount = posting?.headcount ?? 1;

  const { count } = await supabase
    .from("applications").select("*", { count: "exact", head: true })
    .eq("posting_id", postingId).eq("status", "승인");

  return { headcount, approvedCount: count ?? 0, isFull: (count ?? 0) >= headcount };
}

export async function approveApplication(applicationId: string) {
  const supabase = createAdminClient();

  // 모집인원 초과 체크
  const { data: app } = await supabase
    .from("applications").select("posting_id").eq("id", applicationId).single();

  if (app?.posting_id) {
    const { isFull } = await getHeadcountStatus(app.posting_id);
    if (isFull) {
      return { error: "모집인원이 모두 차서 더 이상 승인할 수 없습니다.", headcountFull: true };
    }
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "승인", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  await createWorkRecordFromApproval(applicationId);

  // 승인 푸시 알림 (실패해도 승인 처리에 영향 없음)
  getApprovalInfo(applicationId)
    .then((info) => {
      if (info) notifyApplicationApproved(info.memberId, info.companyName, info.workDate);
    })
    .catch(console.error);

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

  // 거절 푸시 알림 (실패해도 거절 처리에 영향 없음)
  getApprovalInfo(applicationId)
    .then((info) => {
      if (info) notifyApplicationRejected(info.memberId, info.companyName, info.workDate);
    })
    .catch(console.error);

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
        posting_type,
        start_date,
        end_date,
        work_days,
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
    posting_type: string;
    start_date: string | null;
    end_date: string | null;
    work_days: number[] | null;
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

  const baseRecord = {
    member_id: app.member_id,
    posting_id: posting.id,
    application_id: app.id,
    client_name: client.company_name,
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
    income_tax: salary.incomeTax,
    total_deduction: salary.totalDeduction,
    net_pay: salary.netPay,
    status: "대기",
    signature_url: null,
    contract_pdf_url: null,
    signed_at: null,
    admin_memo: null,
  };

  if (
    posting.posting_type === "fixed_term" &&
    posting.start_date &&
    posting.end_date &&
    posting.work_days
  ) {
    // 기간제: 근무일별로 work_record 다건 생성
    const workDates = getWorkDatesInRange(
      posting.start_date,
      posting.end_date,
      posting.work_days
    );

    if (workDates.length === 0) return;

    const records = workDates.map((date) => ({
      ...baseRecord,
      work_date: date,
    }));

    await supabase.from("work_records").insert(records);
  } else {
    // daily: 기존 로직 (단일 insert)
    await supabase.from("work_records").insert({
      ...baseRecord,
      work_date: posting.work_date,
    });
  }
}

export async function revertApplicationToPending(applicationId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("applications")
    .update({ status: "대기", reviewed_at: null })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  // 승인 시 생성된 work_record 삭제 (다건도 OK)
  await supabase
    .from("work_records")
    .delete()
    .eq("application_id", applicationId);

  revalidatePath("/admin/applications");
  revalidatePath("/admin/payroll");
  return { error: null };
}

export async function batchApproveApplications(applicationIds: string[]) {
  let success = 0;
  let failed = 0;
  let skippedFull = 0;
  const errors: string[] = [];

  const supabase = createAdminClient();

  // 각 application의 posting_id 일괄 조회
  const { data: apps } = await supabase
    .from("applications").select("id, posting_id").in("id", applicationIds);

  // posting_id별 남은 슬롯 추적
  const remainingSlots = new Map<string, number>();

  for (const app of apps ?? []) {
    const postingId = app.posting_id;
    if (!remainingSlots.has(postingId)) {
      const { headcount, approvedCount } = await getHeadcountStatus(postingId);
      remainingSlots.set(postingId, headcount - approvedCount);
    }

    const slots = remainingSlots.get(postingId)!;
    if (slots <= 0) {
      skippedFull++;
      continue;
    }

    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: "승인", reviewed_at: new Date().toISOString() })
        .eq("id", app.id);

      if (error) {
        failed++;
        errors.push(`${app.id}: ${error.message}`);
        continue;
      }

      await createWorkRecordFromApproval(app.id);

      getApprovalInfo(app.id)
        .then((info) => {
          if (info) notifyApplicationApproved(info.memberId, info.companyName, info.workDate);
        })
        .catch(console.error);

      remainingSlots.set(postingId, slots - 1);
      success++;
    } catch (e) {
      failed++;
      errors.push(`${app.id}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/payroll");
  return { success, failed, skippedFull, errors };
}

export async function deleteApplication(applicationId: string) {
  const supabase = createAdminClient();

  // 관련 work_records 먼저 삭제
  await supabase
    .from("work_records")
    .delete()
    .eq("application_id", applicationId);

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", applicationId);

  revalidatePath("/admin/applications");
  revalidatePath("/admin/payroll");
  return { error: error?.message ?? null };
}

export async function updateApplicationMemo(
  applicationId: string,
  memo: string
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("applications")
    .update({ admin_memo: memo || null })
    .eq("id", applicationId);

  revalidatePath("/admin/applications");
  return { error: error?.message ?? null };
}

/** 푸시 알림용: 지원 정보 조회 */
async function getApprovalInfo(applicationId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("applications")
    .select(`member_id, job_postings(work_date, posting_type, start_date, end_date, clients(company_name))`)
    .eq("id", applicationId)
    .single();

  if (!data?.job_postings) return null;

  const posting = data.job_postings as unknown as {
    work_date: string;
    posting_type: string;
    start_date: string | null;
    end_date: string | null;
    clients: { company_name: string };
  };

  const workDate = posting.posting_type === "fixed_term" && posting.start_date && posting.end_date
    ? `${posting.start_date}~${posting.end_date}`
    : posting.work_date;

  return {
    memberId: data.member_id as string,
    companyName: posting.clients.company_name,
    workDate,
  };
}

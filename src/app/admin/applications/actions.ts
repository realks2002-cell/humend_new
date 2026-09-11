"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { calculateWorkHours, calculateFullSalary } from "@/lib/utils/salary";
import { getWorkDatesInRange } from "@/lib/utils/date";
import { revalidatePath } from "next/cache";
import { notifyApplicationApproved, notifyApplicationRejected } from "@/lib/push/notify";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { applyApplicationOverride } from "@/lib/application-override";

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
  await requireAdmin();
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
  await requireAdmin();
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

// 근무지·시간·시급으로 계약서(work_records) 근무조건 + 예상 급여 계산 (8시간 초과 시 30분 휴게)
function buildWorkTermsAndPay(clientName: string, startTime: string, endTime: string, hourlyWage: number) {
  const totalRaw = calculateWorkHours({ startTime, endTime });
  const breakMinutes = totalRaw.totalHours > 8 ? 30 : 0;
  const hours = calculateWorkHours({ startTime, endTime, breakMinutes });
  const salary = calculateFullSalary({
    hourlyWage,
    workHours: hours.workHours,
    overtimeHours: hours.overtimeHours,
  });
  return {
    client_name: clientName,
    start_time: startTime,
    end_time: endTime,
    break_minutes: breakMinutes,
    hourly_wage: hourlyWage,
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
  };
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
      override_client_id,
      override_start_time,
      override_end_time,
      override_client:clients!override_client_id (company_name, hourly_wage),
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

  // 관리자가 지원 건 근무지·시간을 수정했으면 그 값으로 생성
  const posting = applyApplicationOverride(app).job_postings as unknown as {
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

  const baseRecord = {
    member_id: app.member_id,
    posting_id: posting.id,
    application_id: app.id,
    ...buildWorkTermsAndPay(client.company_name, posting.start_time, posting.end_time, client.hourly_wage),
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
  await requireAdmin();
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
  await requireAdmin();
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

export async function batchRejectApplications(applicationIds: string[]) {
  await requireAdmin();
  let success = 0;
  let failed = 0;
  const supabase = createAdminClient();

  for (const id of applicationIds) {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: "거절", reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        failed++;
        continue;
      }

      getApprovalInfo(id)
        .then((info) => {
          if (info) notifyApplicationRejected(info.memberId, info.companyName, info.workDate);
        })
        .catch(console.error);

      success++;
    } catch {
      failed++;
    }
  }

  revalidatePath("/admin/applications");
  return { success, failed };
}

export async function batchDeleteApplications(applicationIds: string[]) {
  await requireAdmin();
  let success = 0;
  let failed = 0;
  const supabase = createAdminClient();

  for (const id of applicationIds) {
    try {
      await supabase.from("work_records").delete().eq("application_id", id);
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) {
        failed++;
        continue;
      }
      success++;
    } catch {
      failed++;
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/payroll");
  return { success, failed };
}

export async function deleteApplication(applicationId: string) {
  await requireAdmin();
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
  await requireAdmin();
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
    .select(`member_id, override_client_id, override_client:clients!override_client_id(company_name), job_postings(work_date, posting_type, start_date, end_date, clients(company_name))`)
    .eq("id", applicationId)
    .single();

  if (!data?.job_postings) return null;

  const posting = applyApplicationOverride(data).job_postings as unknown as {
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

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// 관리자: 지원 건 근무지·근무시간 수정 → 승인된 건은 계약서(work_records, 서명된 것 포함)도 새 근무지 시급으로 갱신
export async function updateApplicationWork(
  applicationId: string,
  input: { clientId: string; startTime: string; endTime: string },
) {
  await requireAdmin();
  const supabase = createAdminClient();

  if (!TIME_RE.test(input.startTime) || !TIME_RE.test(input.endTime)) {
    return { error: "시간 형식이 올바르지 않습니다." };
  }
  if (input.startTime === input.endTime) return { error: "시작·종료 시간이 같습니다." };

  const { data: app } = await supabase
    .from("applications")
    .select("id, status, job_postings(client_id, start_time, end_time)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app?.job_postings) return { error: "지원 건을 찾을 수 없습니다." };
  const posting = app.job_postings as unknown as { client_id: string; start_time: string; end_time: string };

  const { data: client } = await supabase
    .from("clients")
    .select("id, company_name, hourly_wage")
    .eq("id", input.clientId)
    .maybeSingle();
  if (!client) return { error: "근무지를 찾을 수 없습니다." };

  // 공고와 같은 값은 수정값으로 두지 않음 → 공고 값을 다시 고르면 원래대로
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      override_client_id: input.clientId === posting.client_id ? null : input.clientId,
      override_start_time: input.startTime === posting.start_time.slice(0, 5) ? null : input.startTime,
      override_end_time: input.endTime === posting.end_time.slice(0, 5) ? null : input.endTime,
    })
    .eq("id", applicationId);
  if (updateError) return { error: updateError.message };

  let updatedRecords = 0;
  if (app.status === "승인") {
    const { data: records, error: wrError } = await supabase
      .from("work_records")
      .update(buildWorkTermsAndPay(client.company_name, input.startTime, input.endTime, client.hourly_wage))
      .eq("application_id", applicationId)
      .select("id");
    if (wrError) return { error: `계약서 갱신 실패: ${wrError.message}` };
    updatedRecords = records?.length ?? 0;

    // 급여가 이미 확정된 건은 계약서가 급여 쪽 시간을 우선 표시 → 시간만 맞춤 (금액은 확정값 유지)
    if (updatedRecords > 0) {
      const { error: payError } = await supabase
        .from("payments")
        .update({ start_time: input.startTime, end_time: input.endTime })
        .in("work_record_id", records!.map((r) => r.id));
      if (payError) return { error: `급여 시간 갱신 실패: ${payError.message}` };
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/payroll");
  revalidatePath("/admin/contracts");
  return { error: null, updatedRecords };
}

// 관리자: 지원 건 수정값을 지우고 공고 근무지·시간으로 되돌림 (승인된 건은 계약서도 공고 기준으로 재계산)
export async function resetApplicationWork(applicationId: string) {
  await requireAdmin();
  const { data: app } = await createAdminClient()
    .from("applications")
    .select("job_postings(client_id, start_time, end_time)")
    .eq("id", applicationId)
    .maybeSingle();
  const posting = app?.job_postings as unknown as { client_id: string; start_time: string; end_time: string } | null;
  if (!posting) return { error: "지원 건을 찾을 수 없습니다.", updatedRecords: 0 };
  return updateApplicationWork(applicationId, {
    clientId: posting.client_id,
    startTime: posting.start_time.slice(0, 5),
    endTime: posting.end_time.slice(0, 5),
  });
}

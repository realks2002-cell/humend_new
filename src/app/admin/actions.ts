"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getDashboardStats(currentMonth: string) {
  const admin = createAdminClient();

  const start = `${currentMonth}-01`;
  const endDate = new Date(Number(currentMonth.split("-")[0]), Number(currentMonth.split("-")[1]), 0);
  const end = `${currentMonth}-${String(endDate.getDate()).padStart(2, "0")}`;

  const [
    { count: memberCount },
    { count: clientCount },
    { count: pendingAppCount },
    { count: approvedAppCount },
    { count: rejectedAppCount },
    { data: paymentsData },
  ] = await Promise.all([
    admin.from("members").select("*", { count: "exact", head: true }),
    admin.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "대기"),
    admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "승인"),
    admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "거절"),
    admin.from("payments")
      .select("gross_pay, net_pay, status, work_records!inner(work_date)")
      .gte("work_records.work_date", start)
      .lte("work_records.work_date", end),
  ]);

  // 이번 달 급여 합산 (payments 테이블 기준)
  let totalGross = 0;
  let totalNet = 0;
  if (paymentsData) {
    for (const p of paymentsData) {
      totalGross += (p as { gross_pay: number }).gross_pay ?? 0;
      totalNet += (p as { net_pay: number }).net_pay ?? 0;
    }
  }

  // 이번 달 확정된 근무 건수 (work_records에서 서명 완료)
  const { count: workRecordCount } = await admin
    .from("work_records")
    .select("*", { count: "exact", head: true })
    .gte("work_date", start)
    .lte("work_date", end)
    .not("signature_url", "is", null);

  return {
    memberCount: memberCount ?? 0,
    clientCount: clientCount ?? 0,
    pendingAppCount: pendingAppCount ?? 0,
    approvedAppCount: approvedAppCount ?? 0,
    rejectedAppCount: rejectedAppCount ?? 0,
    workRecordCount: workRecordCount ?? 0,
    totalGross,
    totalNet,
  };
}

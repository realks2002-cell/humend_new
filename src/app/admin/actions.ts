"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getDashboardStats(currentMonth: string) {
  const admin = createAdminClient();

  const [selYear, selMonth] = currentMonth.split("-").map(Number);

  // 선택 월 범위
  const start = `${currentMonth}-01`;
  const endDate = new Date(selYear, selMonth, 0);
  const end = `${currentMonth}-${String(endDate.getDate()).padStart(2, "0")}`;

  // 6개월 범위 (선택 월 포함 최근 6개월)
  const fourMonthsAgo = new Date(selYear, selMonth - 6, 1);
  const rangeStart = `${fourMonthsAgo.getFullYear()}-${String(fourMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

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
      .select("net_pay, work_records!inner(work_date)")
      .gte("work_records.work_date", rangeStart)
      .lte("work_records.work_date", end),
  ]);

  // 월별 급여 합산 (payments 테이블 기준)
  const monthlyPayroll: Record<string, number> = {};
  if (paymentsData) {
    for (const p of paymentsData as { net_pay: number; work_records: { work_date: string } | { work_date: string }[] }[]) {
      const wr = Array.isArray(p.work_records) ? p.work_records[0] : p.work_records;
      if (!wr) continue;
      const wd = wr.work_date;
      const monthKey = wd.slice(0, 7); // "YYYY-MM"
      monthlyPayroll[monthKey] = (monthlyPayroll[monthKey] ?? 0) + (p.net_pay ?? 0);
    }
  }

  const totalNet = monthlyPayroll[currentMonth] ?? 0;

  // 선택 월 확정된 근무 건수 (work_records에서 서명 완료)
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
    totalNet,
    monthlyPayroll,
  };
}

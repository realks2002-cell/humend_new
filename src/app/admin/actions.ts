"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

// Supabase는 한 번에 최대 1,000행만 반환하므로 끝까지 나눠서 조회
async function fetchPaymentsInRange(admin: ReturnType<typeof createAdminClient>, rangeStart: string, end: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("payments")
      .select("net_pay, work_records!inner(work_date)")
      .gte("work_records.work_date", rangeStart)
      .lte("work_records.work_date", end)
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(`급여 조회 실패: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

export async function getDashboardStats(currentMonth: string) {
  await requireAdmin();
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
    paymentsData,
  ] = await Promise.all([
    admin.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "대기"),
    admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "승인"),
    admin.from("applications").select("*", { count: "exact", head: true }).eq("status", "거절"),
    fetchPaymentsInRange(admin, rangeStart, end),
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

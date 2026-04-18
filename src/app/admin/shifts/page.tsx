export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { ShiftTable, type ShiftWithDetails, type ApprovedPosting, type ClientPosting } from "./shift-table";

export default async function AdminShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const selectedDate = params.date || today;

  const { data: shifts } = await supabase
    .from("daily_shifts")
    .select(
      `
      id, client_id, member_id, work_date, start_time, end_time,
      arrival_status, arrived_at, confirmed_at, approaching_at, nearby_at,
      alert_minutes_before, notification_sent_count,
      sort_order, created_at, updated_at,
      clients!inner (company_name, location, latitude, longitude, contact_phone),
      members (name, phone),
      departure_logs (id, departed_at, returned_at, duration_minutes)
    `
    )
    .eq("work_date", selectedDate)
    .order("sort_order", { ascending: true })
    .order("start_time", { ascending: true });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, location")
    .order("company_name");

  const { data: members } = await supabase
    .from("members")
    .select("id, name, phone")
    .order("name");

  // 전체 공고 조회 (캐스케이드 드롭다운용)
  const { data: dailyPostings } = await supabase
    .from("job_postings")
    .select(`
      id, client_id, work_date, start_time, end_time,
      posting_type, start_date, end_date,
      clients!inner (company_name, location)
    `)
    .gte("work_date", today)
    .order("work_date", { ascending: true });

  const { data: fixedTermPostings } = await supabase
    .from("job_postings")
    .select(`
      id, client_id, work_date, start_time, end_time,
      posting_type, start_date, end_date,
      clients!inner (company_name, location)
    `)
    .eq("posting_type", "fixed_term")
    .gte("end_date", today);

  const combinedPostings = [
    ...(dailyPostings ?? []),
    ...(fixedTermPostings ?? []).filter(
      (fp) => !(dailyPostings ?? []).some((ap) => ap.id === fp.id)
    ),
  ];

  const allPostingIds = combinedPostings.map((p) => p.id);
  const { data: approvedApps } = allPostingIds.length > 0
    ? await supabase
        .from("applications")
        .select(`posting_id, members!inner (id, name, phone)`)
        .eq("status", "승인")
        .in("posting_id", allPostingIds)
    : { data: [] };

  const approvedByPosting = new Map<string, { id: string; name: string | null; phone: string }[]>();
  for (const app of approvedApps ?? []) {
    const member = app.members as any;
    if (!approvedByPosting.has(app.posting_id)) {
      approvedByPosting.set(app.posting_id, []);
    }
    approvedByPosting.get(app.posting_id)!.push({
      id: member.id,
      name: member.name,
      phone: member.phone,
    });
  }

  // 고객사별 공고 그룹핑
  const clientPostingsMap = new Map<string, ClientPosting>();
  for (const p of combinedPostings) {
    const client = p.clients as any;
    const clientId = p.client_id;
    if (!clientPostingsMap.has(clientId)) {
      clientPostingsMap.set(clientId, {
        clientId,
        clientName: client?.company_name ?? "",
        clientLocation: client?.location ?? "",
        postings: [],
      });
    }
    if (p.posting_type === "fixed_term" && p.start_date && p.end_date) {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      const todayDate = new Date(today);
      const fromDate = start > todayDate ? start : todayDate;
      for (let d = new Date(fromDate); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        clientPostingsMap.get(clientId)!.postings.push({
          postingId: p.id,
          workDate: dateStr,
          startTime: p.start_time,
          endTime: p.end_time,
          approvedMembers: approvedByPosting.get(p.id) ?? [],
        });
      }
    } else if (p.work_date) {
      clientPostingsMap.get(clientId)!.postings.push({
        postingId: p.id,
        workDate: p.work_date,
        startTime: p.start_time,
        endTime: p.end_time,
        approvedMembers: approvedByPosting.get(p.id) ?? [],
      });
    }
  }
  const clientPostings = Array.from(clientPostingsMap.values());

  const datePostings = combinedPostings.filter((p) => {
    if (p.work_date === selectedDate) return true;
    if (p.posting_type === "fixed_term" && p.start_date && p.end_date) {
      return p.start_date <= selectedDate && p.end_date >= selectedDate;
    }
    return false;
  });
  const approvedPostings: ApprovedPosting[] = datePostings.map((p) => {
    const client = p.clients as any;
    return {
      postingId: p.id,
      clientId: p.client_id,
      clientName: client?.company_name ?? "",
      clientLocation: client?.location ?? "",
      workDate: selectedDate,
      startTime: p.start_time,
      endTime: p.end_time,
      approvedMembers: approvedByPosting.get(p.id) ?? [],
    };
  });

  const assignedMemberIds = (shifts ?? []).map((s: any) => s.member_id as string);

  // FCM 발송 기록 조회 (해당 날짜 배정 회원 대상, 오늘 기준)
  const uniqueMemberIds = [...new Set(assignedMemberIds)];
  const { data: notificationLogs } = uniqueMemberIds.length > 0
    ? await supabase
        .from("notification_logs")
        .select("id, title, body, target_member_id, shift_id, sent_count, trigger_type, created_at")
        .in("target_member_id", uniqueMemberIds)
        .gte("created_at", `${selectedDate}T00:00:00+09:00`)
        .lte("created_at", `${selectedDate}T23:59:59+09:00`)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">근무표 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          날짜별 근무 배정을 관리합니다.
        </p>
      </div>
      <ShiftTable
        shifts={(shifts ?? []) as unknown as ShiftWithDetails[]}
        clients={clients ?? []}
        members={members ?? []}
        selectedDate={selectedDate}
        approvedPostings={approvedPostings}
        clientPostings={clientPostings}
        assignedMemberIds={assignedMemberIds}
        notificationLogs={(notificationLogs ?? []) as any}
      />
    </div>
  );
}

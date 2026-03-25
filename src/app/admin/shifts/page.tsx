export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { ShiftTable, type ShiftWithDetails, type ApprovedPosting } from "./shift-table";

export default async function AdminShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  // 기본 날짜: 오늘 (KST)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const selectedDate = params.date || today;

  // 해당 날짜 배정 조회
  const { data: shifts } = await supabase
    .from("daily_shifts")
    .select(
      `
      id, client_id, member_id, work_date, start_time, end_time,
      arrival_status, arrived_at, confirmed_at, nearby_at,
      alert_minutes_before, notification_sent_count,
      created_at, updated_at,
      clients!inner (company_name, location, latitude, longitude, contact_phone),
      members (name, phone)
    `
    )
    .eq("work_date", selectedDate)
    .order("start_time", { ascending: true });

  // 고객사 목록 (등록 폼용)
  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, location")
    .order("company_name");

  // 회원 목록 (등록 폼용)
  const { data: members } = await supabase
    .from("members")
    .select("id, name, phone")
    .order("name");

  // 해당 날짜의 전체 공고 조회 (일일: work_date 매칭, 기간제: start_date~end_date 범위)
  const { data: allPostings } = await supabase
    .from("job_postings")
    .select(
      `
      id, client_id, work_date, start_time, end_time,
      posting_type, start_date, end_date,
      clients!inner (company_name, location)
    `
    )
    .or(
      `work_date.eq.${selectedDate},and(start_date.lte.${selectedDate},end_date.gte.${selectedDate})`
    );

  const datePostings = allPostings ?? [];

  // 해당 공고들의 승인 지원자 조회
  const postingIds = datePostings.map((p) => p.id);
  const { data: approvedApps } = postingIds.length > 0
    ? await supabase
        .from("applications")
        .select(`posting_id, members!inner (id, name, phone)`)
        .eq("status", "승인")
        .in("posting_id", postingIds)
    : { data: [] };

  // 공고별 승인 지원자 그룹화
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

  // 전체 공고 → ApprovedPosting 변환 (승인 지원자 0명도 포함)
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
      />
    </div>
  );
}

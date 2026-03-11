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
      arrival_status, risk_level, arrived_at,
      last_known_lat, last_known_lng, last_seen_at,
      location_consent, tracking_started_at,
      created_at, updated_at,
      clients (company_name, location, latitude, longitude, contact_phone),
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

  // 승인된 지원 조회 (일일 공고: work_date 매칭, 기간제: start_date~end_date 범위)
  const { data: approvedApps } = await supabase
    .from("applications")
    .select(
      `
      id, posting_id, member_id, status,
      job_postings!inner (
        id, client_id, work_date, start_time, end_time,
        posting_type, start_date, end_date,
        clients (company_name, location)
      ),
      members!inner (id, name, phone)
    `
    )
    .eq("status", "승인");

  // selectedDate에 해당하는 승인 지원만 필터 + 공고별 그룹화
  const postingMap = new Map<string, ApprovedPosting>();

  for (const app of approvedApps ?? []) {
    const posting = app.job_postings as any;
    if (!posting) continue;

    const isDaily = posting.posting_type !== "fixed_term";
    const matchesDate = isDaily
      ? posting.work_date === selectedDate
      : posting.start_date <= selectedDate && posting.end_date >= selectedDate;

    if (!matchesDate) continue;

    const postingId = posting.id as string;
    if (!postingMap.has(postingId)) {
      const client = posting.clients as any;
      postingMap.set(postingId, {
        postingId,
        clientId: posting.client_id,
        clientName: client?.company_name ?? "",
        clientLocation: client?.location ?? "",
        workDate: selectedDate,
        startTime: posting.start_time,
        endTime: posting.end_time,
        approvedMembers: [],
      });
    }

    const member = app.members as any;
    postingMap.get(postingId)!.approvedMembers.push({
      id: member.id,
      name: member.name,
      phone: member.phone,
    });
  }

  const approvedPostings = Array.from(postingMap.values());

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

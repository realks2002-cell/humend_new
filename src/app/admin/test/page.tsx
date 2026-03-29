export const dynamic = "force-dynamic";

import Script from "next/script";
import { createAdminClient } from "@/lib/supabase/server";
import { type ShiftWithDetails } from "../shifts/shift-table";
import { getTestMembers } from "./actions";
import { TestToolbar, TestShiftTable } from "./test-client";

export default async function AdminTestPage({
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

  // 테스트 고객사만 조회 (is_test = true)
  const { data: testClients } = await supabase
    .from("clients")
    .select("id, company_name, location")
    .eq("is_test", true)
    .order("company_name");

  const testClientIds = (testClients ?? []).map((c) => c.id);

  // 테스트 고객사의 배정만 조회
  const { data: shifts } = testClientIds.length > 0
    ? await supabase
        .from("daily_shifts")
        .select(`
          id, client_id, member_id, work_date, start_time, end_time,
          arrival_status, arrived_at, confirmed_at, nearby_at,
          alert_minutes_before, notification_sent_count,
          created_at, updated_at,
          clients!inner (company_name, location, latitude, longitude, contact_phone),
          members (name, phone),
          departure_logs (id, departed_at, returned_at, duration_minutes)
        `)
        .in("client_id", testClientIds)
        .eq("work_date", selectedDate)
        .order("start_time", { ascending: true })
    : { data: [] };

  // 전체 회원 (배정 시 검색용)
  const { data: members } = await supabase
    .from("members")
    .select("id, name, phone")
    .order("name");

  const assignedMemberIds = (shifts ?? []).map((s: any) => s.member_id as string);

  // FCM 발송 기록
  const uniqueMemberIds = [...new Set(assignedMemberIds)];
  const { data: notificationLogs } = uniqueMemberIds.length > 0
    ? await supabase
        .from("notification_logs")
        .select("id, title, body, target_member_id, sent_count, trigger_type, created_at")
        .in("target_member_id", uniqueMemberIds)
        .gte("created_at", `${selectedDate}T00:00:00+09:00`)
        .lte("created_at", `${selectedDate}T23:59:59+09:00`)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  // 테스트 멤버 (테스터 관리 섹션용)
  const testMembers = await getTestMembers();

  return (
    <div className="p-6 space-y-6">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=geocoding`}
        strategy="afterInteractive"
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">근무 테스트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          테스트 근무지 등록 → 배정 → FCM 알림 → 지오펜싱 출근 확인 전체 흐름을 테스트합니다.
        </p>
      </div>

      {/* 테스트 도구 (근무지 등록, 테스터 관리, cron 트리거 등) */}
      <TestToolbar testClients={testClients ?? []} testMembers={testMembers} />

      {/* 근무표 — /admin/shifts와 동일한 ShiftTable (testMode) */}
      <TestShiftTable
        shifts={(shifts ?? []) as unknown as ShiftWithDetails[]}
        clients={testClients ?? []}
        members={members ?? []}
        selectedDate={selectedDate}
        assignedMemberIds={assignedMemberIds}
        notificationLogs={(notificationLogs ?? []) as any}
      />
    </div>
  );
}

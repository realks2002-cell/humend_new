export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { TrackingMap } from "./tracking-map";
import { WorkerList } from "./worker-list";
import type { DailyShiftWithDetails } from "@/types/location";

export default async function AdminTrackingPage() {
  const supabase = createAdminClient();

  // 오늘 날짜 (KST)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

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
    .eq("work_date", today)
    .order("start_time", { ascending: true });

  const typedShifts = (shifts ?? []) as unknown as DailyShiftWithDetails[];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">출근 추적</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          오늘 ({today}) 근무자의 실시간 출근 상태를 확인합니다.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TrackingMap shifts={typedShifts} />
        </div>
        <div>
          <WorkerList shifts={typedShifts} />
        </div>
      </div>
    </div>
  );
}

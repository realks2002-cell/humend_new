// ========== daily_shifts 테이블 (출근확인 시스템) ==========

export type AttendanceStatus =
  | "pending"     // 배정됨 (알림 전)
  | "notified"    // 알림 발송됨 (응답 대기)
  | "confirmed"   // 출근 의사 확인 (알림 터치)
  | "arrived"     // 출근 확인 (30m 지오펜싱)
  | "noshow";     // 노쇼 확정

export interface DailyShift {
  id: string;
  client_id: string;
  member_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  arrival_status: AttendanceStatus;
  arrived_at: string | null;
  confirmed_at: string | null;
  nearby_at: string | null;
  alert_minutes_before: number;
  alert_interval_minutes: number;
  alert_max_count: number;
  notification_sent_count: number;
  last_notification_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyShiftWithDetails extends DailyShift {
  clients: {
    company_name: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    contact_phone: string;
  };
  members: {
    name: string | null;
    phone: string;
  };
}

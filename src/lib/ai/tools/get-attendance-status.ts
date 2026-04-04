import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getAttendanceStatus = (memberId: string) =>
  tool({
    description: "회원의 출근 확인 상태를 조회합니다. 오늘 또는 특정 날짜의 출근 상태를 확인합니다.",
    inputSchema: z.object({
      date: z.string().optional().describe("조회할 날짜 (YYYY-MM-DD). 생략 시 오늘"),
    }),
    execute: async ({ date }: { date?: string }) => {
      const supabase = createAdminClient();
      const targetDate = date ?? new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: shifts } = await supabase
        .from("daily_shifts")
        .select(`
          work_date, start_time, end_time, arrival_status,
          arrived_at, confirmed_at,
          clients (company_name, location)
        `)
        .eq("member_id", memberId)
        .eq("work_date", targetDate);

      if (!shifts || shifts.length === 0) {
        return { found: false, message: `${targetDate}에 배정된 근무가 없습니다.` };
      }

      const statusLabels: Record<string, string> = {
        pending: "배정됨 (출근 전)",
        notified: "알림 발송됨",
        confirmed: "출근 의사 확인",
        arrived: "출근 완료",
        noshow: "미출근",
      };

      return {
        found: true,
        date: targetDate,
        shifts: shifts.map((s) => ({
          workplace: (s.clients as unknown as { company_name: string })?.company_name,
          time: `${s.start_time?.slice(0, 5)} ~ ${s.end_time?.slice(0, 5)}`,
          status: statusLabels[s.arrival_status] ?? s.arrival_status,
          arrivedAt: s.arrived_at,
        })),
      };
    },
  });

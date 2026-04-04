import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getSchedule = (memberId: string) =>
  tool({
    description: "회원의 근무 일정을 조회합니다. 배정된 근무의 날짜, 시간, 장소를 확인할 수 있습니다.",
    inputSchema: z.object({
      startDate: z.string().describe("조회 시작 날짜 (YYYY-MM-DD)"),
      endDate: z.string().describe("조회 종료 날짜 (YYYY-MM-DD)"),
    }),
    execute: async ({ startDate, endDate }) => {
      const supabase = createAdminClient();

      const { data: shifts } = await supabase
        .from("daily_shifts")
        .select(`
          work_date, start_time, end_time, arrival_status,
          clients (company_name, location)
        `)
        .eq("member_id", memberId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: true });

      if (!shifts || shifts.length === 0) {
        return { found: false, message: "해당 기간에 배정된 근무가 없습니다." };
      }

      return {
        found: true,
        count: shifts.length,
        shifts: shifts.map((s) => ({
          date: s.work_date,
          time: `${s.start_time?.slice(0, 5)} ~ ${s.end_time?.slice(0, 5)}`,
          workplace: (s.clients as unknown as { company_name: string })?.company_name,
          location: (s.clients as unknown as { location: string })?.location,
          status: s.arrival_status,
        })),
      };
    },
  });

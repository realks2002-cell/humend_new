import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const searchJobs = () =>
  tool({
    description: "현재 모집 중인 일자리를 검색합니다. 날짜, 지역, 시급 조건으로 필터링할 수 있습니다.",
    inputSchema: z.object({
      startDate: z.string().optional().describe("시작 날짜 (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("종료 날짜 (YYYY-MM-DD)"),
      region: z.string().optional().describe("지역 키워드 (예: 강남, 용인)"),
      minWage: z.number().optional().describe("최소 시급"),
    }),
    execute: async ({ startDate, endDate, region, minWage }: { startDate?: string; endDate?: string; region?: string; minWage?: number }) => {
      const supabase = createAdminClient();
      const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

      let query = supabase
        .from("job_postings")
        .select(`
          id, work_date, start_time, end_time, headcount, status,
          clients (company_name, location, hourly_wage)
        `)
        .eq("status", "open")
        .gte("work_date", startDate ?? today)
        .order("work_date", { ascending: true })
        .limit(10);

      if (endDate) query = query.lte("work_date", endDate);

      const { data: postings } = await query;

      if (!postings || postings.length === 0) {
        return { found: false, message: "조건에 맞는 일자리가 없습니다." };
      }

      let filtered = postings;

      if (region) {
        filtered = filtered.filter((p) =>
          (p.clients as unknown as { location: string })?.location?.includes(region)
        );
      }

      if (minWage) {
        filtered = filtered.filter((p) =>
          ((p.clients as unknown as { hourly_wage: number })?.hourly_wage ?? 0) >= minWage
        );
      }

      if (filtered.length === 0) {
        return { found: false, message: "조건에 맞는 일자리가 없습니다." };
      }

      return {
        found: true,
        count: filtered.length,
        jobs: filtered.map((p) => {
          const client = p.clients as unknown as { company_name: string; location: string; hourly_wage: number };
          return {
            postingId: p.id,
            workplace: client?.company_name,
            location: client?.location,
            date: p.work_date,
            time: `${p.start_time?.slice(0, 5)} ~ ${p.end_time?.slice(0, 5)}`,
            hourlyWage: client?.hourly_wage,
            headcount: p.headcount,
          };
        }),
      };
    },
  });

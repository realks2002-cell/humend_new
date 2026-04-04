import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getStaffingStatus = () =>
  tool({
    description: "고객사별 인력 배정 현황을 조회합니다.",
    inputSchema: z.object({
      date: z.string().optional().describe("조회 날짜 (YYYY-MM-DD). 생략 시 오늘"),
      companyName: z.string().optional().describe("고객사명 필터 (부분 일치)"),
    }),
    execute: async ({ date, companyName }: { date?: string; companyName?: string }) => {
      const supabase = createAdminClient();
      const targetDate = date ?? new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: shifts } = await supabase
        .from("daily_shifts")
        .select("arrival_status, clients (company_name)")
        .eq("work_date", targetDate);

      if (!shifts || shifts.length === 0) {
        return { date: targetDate, message: "배정된 근무가 없습니다." };
      }

      const byClient: Record<string, { total: number; arrived: number; noshow: number }> = {};

      for (const s of shifts) {
        const client = s.clients as unknown as { company_name: string } | null;
        const name = client?.company_name ?? "미지정";
        if (companyName && !name.includes(companyName)) continue;

        if (!byClient[name]) byClient[name] = { total: 0, arrived: 0, noshow: 0 };
        byClient[name].total++;
        if (s.arrival_status === "arrived") byClient[name].arrived++;
        if (s.arrival_status === "noshow") byClient[name].noshow++;
      }

      return {
        date: targetDate,
        staffing: Object.entries(byClient).map(([name, data]) => ({
          company: name,
          ...data,
        })),
      };
    },
  });

import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getApplicationStatus = (memberId: string) =>
  tool({
    description: "회원의 지원 현황을 조회합니다. 최근 지원한 공고의 상태(대기/승인/거절)를 확인할 수 있습니다.",
    inputSchema: z.object({
      limit: z.number().optional().describe("조회할 ��수 (기��� 10)"),
    }),
    execute: async ({ limit }: { limit?: number }) => {
      const actualLimit = limit ?? 10;
      const supabase = createAdminClient();

      const { data: apps } = await supabase
        .from("applications")
        .select(`
          status, applied_at,
          job_postings (
            work_date, start_time, end_time,
            clients (company_name)
          )
        `)
        .eq("member_id", memberId)
        .order("applied_at", { ascending: false })
        .limit(actualLimit);

      if (!apps || apps.length === 0) {
        return { found: false, message: "지원 내역이 없습니다." };
      }

      return {
        found: true,
        count: apps.length,
        applications: apps.map((a) => {
          const posting = a.job_postings as unknown as { work_date: string; start_time: string; end_time: string; clients: { company_name: string } } | null;
          return {
            workplace: posting?.clients?.company_name,
            workDate: posting?.work_date,
            time: posting ? `${posting.start_time?.slice(0, 5)} ~ ${posting.end_time?.slice(0, 5)}` : null,
            status: a.status,
            appliedAt: a.applied_at,
          };
        }),
      };
    },
  });

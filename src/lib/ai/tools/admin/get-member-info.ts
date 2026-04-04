import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getMemberInfo = () =>
  tool({
    description: "특정 회원의 종합 정보를 조회합니다. 이름 또는 전화번호로 검색합니다.",
    inputSchema: z.object({
      query: z.string().describe("회원 이름 또는 전화번호"),
    }),
    execute: async ({ query }) => {
      const supabase = createAdminClient();

      let memberQuery = supabase
        .from("members")
        .select("id, name, phone, region, status, created_at")
        .limit(3);

      if (/^\d+$/.test(query)) {
        memberQuery = memberQuery.ilike("phone", `%${query}%`);
      } else {
        memberQuery = memberQuery.ilike("name", `%${query}%`);
      }

      const { data: members } = await memberQuery;

      if (!members || members.length === 0) {
        return { found: false, message: `"${query}" 회원을 찾을 수 없습니다.` };
      }

      const results = [];

      for (const member of members) {
        const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

        const [workResult, appResult, shiftResult] = await Promise.all([
          supabase
            .from("work_records")
            .select("net_pay, status")
            .eq("member_id", member.id)
            .gte("work_date", monthStart)
            .lte("work_date", monthEnd),
          supabase
            .from("applications")
            .select("status")
            .eq("member_id", member.id)
            .gte("applied_at", monthStart),
          supabase
            .from("daily_shifts")
            .select("arrival_status")
            .eq("member_id", member.id)
            .gte("work_date", monthStart)
            .lte("work_date", monthEnd),
        ]);

        const records = workResult.data ?? [];
        const apps = appResult.data ?? [];
        const shifts = shiftResult.data ?? [];

        results.push({
          name: member.name,
          phone: member.phone,
          region: member.region,
          status: member.status,
          thisMonth: {
            workDays: records.length,
            totalNetPay: records.reduce((s, r) => s + (r.net_pay ?? 0), 0),
            applications: apps.length,
            arrivedCount: shifts.filter((s) => s.arrival_status === "arrived").length,
            noshowCount: shifts.filter((s) => s.arrival_status === "noshow").length,
          },
        });
      }

      return { found: true, members: results };
    },
  });

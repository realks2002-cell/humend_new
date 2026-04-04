import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getAttendanceSummary = () =>
  tool({
    description: "오늘 전체 출근 현황을 집계합니다. 배정 인원, 출근 완료, 미출근 등을 보여줍니다.",
    inputSchema: z.object({
      date: z.string().optional().describe("조회 날짜 (YYYY-MM-DD). 생략 시 오늘"),
    }),
    execute: async ({ date }: { date?: string }) => {
      const supabase = createAdminClient();
      const targetDate = date ?? new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: shifts } = await supabase
        .from("daily_shifts")
        .select("arrival_status, members (name, phone), clients (company_name)")
        .eq("work_date", targetDate);

      if (!shifts || shifts.length === 0) {
        return { date: targetDate, total: 0, message: "배정된 근무가 없습니다." };
      }

      const summary = {
        date: targetDate,
        total: shifts.length,
        arrived: shifts.filter((s) => s.arrival_status === "arrived").length,
        confirmed: shifts.filter((s) => s.arrival_status === "confirmed").length,
        notified: shifts.filter((s) => s.arrival_status === "notified").length,
        pending: shifts.filter((s) => s.arrival_status === "pending").length,
        noshow: shifts.filter((s) => s.arrival_status === "noshow").length,
      };

      const notArrived = shifts
        .filter((s) => s.arrival_status !== "arrived" && s.arrival_status !== "noshow")
        .map((s) => {
          const member = s.members as unknown as { name: string; phone: string } | null;
          const client = s.clients as unknown as { company_name: string } | null;
          return {
            name: member?.name,
            phone: member?.phone,
            workplace: client?.company_name,
            status: s.arrival_status,
          };
        });

      return { ...summary, notArrivedList: notArrived };
    },
  });

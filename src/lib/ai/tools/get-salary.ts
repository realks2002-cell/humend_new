import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const getSalary = (memberId: string) =>
  tool({
    description: "회원의 급여 내역을 조회합니다. 월별 급여, 일별 상세, 공제 내역을 확인할 수 있습니다.",
    inputSchema: z.object({
      month: z.string().describe("조회할 월 (YYYY-MM 형식, 예: 2026-04)"),
    }),
    execute: async ({ month }) => {
      const supabase = createAdminClient();
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      const { data: records } = await supabase
        .from("work_records")
        .select("work_date, client_name, work_hours, hourly_wage, base_pay, overtime_pay, gross_pay, total_deduction, net_pay, status")
        .eq("member_id", memberId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: true });

      if (!records || records.length === 0) {
        return { found: false, message: "해당 월에 근무 기록이 없습니다." };
      }

      const totalGross = records.reduce((sum, r) => sum + (r.gross_pay ?? 0), 0);
      const totalDeduction = records.reduce((sum, r) => sum + (r.total_deduction ?? 0), 0);
      const totalNet = records.reduce((sum, r) => sum + (r.net_pay ?? 0), 0);

      return {
        found: true,
        month,
        workDays: records.length,
        totalGrossPay: totalGross,
        totalDeduction,
        totalNetPay: totalNet,
        records: records.map((r) => ({
          date: r.work_date,
          workplace: r.client_name,
          hours: r.work_hours,
          grossPay: r.gross_pay,
          netPay: r.net_pay,
          status: r.status,
        })),
        note: "이 금액은 참고용이며, 최종 금액은 정산 후 확정됩니다.",
      };
    },
  });

import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

export const applyToJob = (memberId: string) =>
  tool({
    description: "채용공고에 지원합니다. 회원이 지원 의사를 밝히면 이 도구를 호출하세요.",
    inputSchema: z.object({
      postingId: z.string().describe("지원할 채용공고 ID"),
    }),
    execute: async ({ postingId }) => {
      const supabase = createAdminClient();

      // 이미 지원했는지 확인
      const { data: existing } = await supabase
        .from("applications")
        .select("id, status")
        .eq("posting_id", postingId)
        .eq("member_id", memberId)
        .maybeSingle();

      if (existing) {
        return { success: false, message: `이미 지원하셨습니다. (상태: ${existing.status})` };
      }

      // 공고 존재/오픈 확인
      const { data: posting } = await supabase
        .from("job_postings")
        .select("id, status, work_date, clients (company_name)")
        .eq("id", postingId)
        .single();

      if (!posting || posting.status !== "open") {
        return { success: false, message: "해당 공고는 마감되었거나 존재하지 않습니다." };
      }

      // 지원
      const { error } = await supabase
        .from("applications")
        .insert({
          posting_id: postingId,
          member_id: memberId,
          status: "대기",
        });

      if (error) {
        return { success: false, message: "지원에 실패했습니다. 다시 시도해주세요." };
      }

      const client = posting.clients as unknown as { company_name: string };
      return {
        success: true,
        message: `${client?.company_name} ${posting.work_date} 공고에 지원이 완료되었습니다. 결과는 알림으로 안내드릴게요.`,
      };
    },
  });

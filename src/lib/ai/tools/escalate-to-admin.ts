import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyChatEscalation } from "@/lib/push/notify";

export const escalateToAdmin = (roomId: string, memberName: string) =>
  tool({
    description: "관리자에게 대화를 전달합니다. AI가 답변하기 어렵거나 회원이 관리자 연결을 요청할 때 호출하세요.",
    inputSchema: z.object({
      reason: z.string().describe("에스컬레이션 사유"),
    }),
    execute: async ({ reason }) => {
      const supabase = createAdminClient();

      // 채팅방 모드를 admin으로 전환
      await supabase
        .from("chat_rooms")
        .update({ mode: "admin" })
        .eq("id", roomId);

      // 관리자에게 FCM 알림
      await notifyChatEscalation(memberName, reason);

      return {
        success: true,
        message: "관리자에게 연결 중입니다. 잠시만 기다려주세요.",
      };
    },
  });

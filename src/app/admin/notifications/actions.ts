"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendManualPush } from "@/lib/push/notify";

export async function sendNotification(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "관리자 권한이 필요합니다." };

  const admin = createAdminClient();
  const { data: adminData } = await admin
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!adminData && process.env.NODE_ENV !== "development") {
    return { error: "관리자 권한이 필요합니다." };
  }

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const targetMemberId = formData.get("target_member_id") as string | null;

  if (!title || !body) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  try {
    const sent = await sendManualPush({
      title,
      body,
      targetMemberId: targetMemberId || undefined,
      sentBy: user.id,
    });

    return { success: true, sent };
  } catch (e) {
    console.error("[sendNotification] error:", e);
    return { error: "알림 발송에 실패했습니다." };
  }
}

export async function getNotificationLogs() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("notification_logs")
    .select("*, members:target_member_id(name, phone)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    target_type: string;
    target_member_id: string | null;
    sent_by: string | null;
    sent_count: number;
    trigger_type: string;
    created_at: string;
    members: { name: string; phone: string } | null;
  }>;
}

export async function getMembers() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("members")
    .select("id, name, phone")
    .eq("status", "active")
    .order("name", { ascending: true });

  return (data ?? []) as Array<{ id: string; name: string | null; phone: string }>;
}

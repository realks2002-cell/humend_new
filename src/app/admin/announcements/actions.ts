"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

// 관리자 권한 확인 (admin/notifications 패턴과 동일)
async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
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
  return { userId: user.id };
}

export type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  target_type: string;
  font_size: number;
  expires_at: string | null;
  created_at: string;
  read_count: number;
};

export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  const auth = await requireAdmin();
  if ("error" in auth) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("announcements")
    .select("*, announcement_reads(count)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    target_type: string;
    font_size: number;
    expires_at: string | null;
    created_at: string;
    announcement_reads: { count: number }[];
  }>).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    target_type: a.target_type,
    font_size: a.font_size,
    expires_at: a.expires_at,
    created_at: a.created_at,
    read_count: a.announcement_reads?.[0]?.count ?? 0,
  }));
}

export async function createAnnouncement(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  if (!title || !body) return { error: "제목과 내용을 입력해주세요." };

  const rawTarget = formData.get("target_type") as string | null;
  const targetType = rawTarget === "users" ? "users" : "all";

  const fontSizeRaw = Number(formData.get("font_size"));
  const fontSize = Number.isFinite(fontSizeRaw)
    ? Math.min(32, Math.max(10, Math.round(fontSizeRaw)))
    : 16;

  const expiresRaw = (formData.get("expires_at") as string | null)?.trim();
  const expiresAt = expiresRaw ? expiresRaw : null;

  let userIds: string[] = [];
  if (targetType === "users") {
    try {
      const parsed = JSON.parse((formData.get("user_ids") as string) || "[]");
      if (Array.isArray(parsed)) userIds = parsed.filter((x) => typeof x === "string");
    } catch {
      userIds = [];
    }
    if (userIds.length === 0) return { error: "대상 회원을 1명 이상 선택해주세요." };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("announcements")
    .insert({
      title,
      body,
      target_type: targetType,
      font_size: fontSize,
      expires_at: expiresAt,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[createAnnouncement] error:", error);
    return { error: "공지 등록에 실패했습니다." };
  }

  if (targetType === "users") {
    const rows = userIds.map((uid) => ({
      announcement_id: created.id,
      user_id: uid,
    }));
    const { error: targetError } = await admin
      .from("announcement_targets")
      .insert(rows);
    if (targetError) {
      console.error("[createAnnouncement] target error:", targetError);
      // 대상 등록 실패 시 공지도 롤백 (소프트 삭제)
      await admin.from("announcements").update({ is_active: false }).eq("id", created.id);
      return { error: "대상 회원 등록에 실패했습니다." };
    }
  }

  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("announcements")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("[deleteAnnouncement] error:", error);
    return { error: "삭제에 실패했습니다." };
  }
  return { success: true };
}

export async function getMembers() {
  const auth = await requireAdmin();
  if ("error" in auth) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("members")
    .select("id, name, phone")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(10000);

  return (data ?? []) as Array<{ id: string; name: string | null; phone: string }>;
}

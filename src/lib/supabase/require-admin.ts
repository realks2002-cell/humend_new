import "server-only";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("관리자 권한이 필요합니다.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) throw new Error("관리자 권한이 필요합니다.");
  return user.id;
}

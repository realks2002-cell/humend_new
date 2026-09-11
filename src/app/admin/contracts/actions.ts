"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function getSignatureUrl(signatureUrlPath: string): Promise<string | null> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin.storage.from("signatures").createSignedUrl(signatureUrlPath, 3600);
  return data?.signedUrl ?? null;
}

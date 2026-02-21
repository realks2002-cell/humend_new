"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function getSignatureUrl(signatureUrlPath: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("signatures").createSignedUrl(signatureUrlPath, 3600);
  return data?.signedUrl ?? null;
}

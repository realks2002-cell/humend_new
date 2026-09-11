export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/supabase/queries";
import { getFamilyCertSignedUrl } from "@/lib/family-cert";
import { FamilyCertClient } from "./family-cert-client";

export default async function FamilyCertPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const cert = await getFamilyCertSignedUrl(profile.id);

  if (cert.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{cert.error} 잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  return <FamilyCertClient initialUrl={cert.url ?? null} initialUploadedAt={cert.uploadedAt ?? null} />;
}

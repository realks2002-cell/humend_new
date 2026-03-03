export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getMyProfile, type Member } from "@/lib/supabase/queries";
import { HealthCertForm } from "./health-cert-form";
import { HealthCertView } from "./health-cert-view";

export default async function HealthCertPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  if (profile.health_cert_date && profile.health_cert_image_url) {
    return <HealthCertView profile={profile as Member & { health_cert_date: string; health_cert_image_url: string }} />;
  }

  return <HealthCertForm />;
}

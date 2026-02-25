export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getMyProfile, getMyParentalConsent } from "@/lib/supabase/queries";
import { ConsentForm } from "./consent-form";
import { ConsentView } from "./consent-view";

export default async function ConsentPage() {
  const [profile, consent] = await Promise.all([
    getMyProfile(),
    getMyParentalConsent(),
  ]);

  if (!profile) redirect("/login");

  if (consent) {
    return <ConsentView consent={consent} profile={profile} />;
  }

  return <ConsentForm profile={profile} />;
}

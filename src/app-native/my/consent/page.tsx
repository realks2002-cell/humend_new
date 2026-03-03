"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getMyProfile, getMyParentalConsent } from "@/lib/native-api/queries";
import type { Member, ParentalConsent } from "@/lib/native-api/queries";
import { ConsentForm } from "./consent-form";
import { ConsentView } from "./consent-view";
import { AuthGuard } from "@/lib/native-api/auth-guard";

function ConsentContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Member | null>(null);
  const [consent, setConsent] = useState<ParentalConsent | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [profileData, consentData] = await Promise.all([
        getMyProfile(),
        getMyParentalConsent(),
      ]);

      if (!profileData) {
        router.replace("/login");
        return;
      }

      setProfile(profileData);
      setConsent(consentData);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  if (consent) {
    return <ConsentView consent={consent} profile={profile} />;
  }

  return <ConsentForm profile={profile} />;
}

export default function ConsentPage() {
  return (
    <AuthGuard>
      <ConsentContent />
    </AuthGuard>
  );
}

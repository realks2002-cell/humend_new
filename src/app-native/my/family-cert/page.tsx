"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFamilyCert } from "@/lib/native-api/actions";
import { AuthGuard } from "@/lib/native-api/auth-guard";
import { FamilyCertClient } from "./family-cert-client";

type CertState = { url: string | null; uploadedAt: string | null };

function FamilyCertContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<CertState>({ url: null, uploadedAt: null });
  const [key, setKey] = useState(0);

  useEffect(() => {
    getFamilyCert().then((result) => {
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setCert({ url: result.url ?? null, uploadedAt: result.uploadedAt ?? null });
      }
      setLoading(false);
    });
  }, [key]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            setKey((k) => k + 1);
          }}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return <FamilyCertClient initialUrl={cert.url} initialUploadedAt={cert.uploadedAt} />;
}

export default function FamilyCertPage() {
  return (
    <AuthGuard>
      <div className="pb-32">
        <FamilyCertContent />
      </div>
    </AuthGuard>
  );
}

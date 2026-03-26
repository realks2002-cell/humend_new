"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FileSignature, Loader2 } from "lucide-react";
import { getMyWorkRecords, getMyProfile } from "@/lib/native-api/queries";
import type { WorkRecord, Member } from "@/lib/native-api/queries";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { ContractViewModal } from "../salary/contract-view-modal";
import { AuthGuard } from "@/lib/native-api/auth-guard";

function ContractsContent() {
  const [signedRecords, setSignedRecords] = useState<WorkRecord[]>([]);
  const [profile, setProfile] = useState<Member | null>(null);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [records, prof] = await Promise.all([
        getMyWorkRecords(),
        getMyProfile(),
      ]);

      setProfile(prof);

      const signed = records.filter((r) => r.signature_url);
      setSignedRecords(signed);

      // Attempt to create signed URLs using browser client
      const supabase = createClient();
      const urls: Record<string, string> = {};
      for (const r of signed) {
        if (r.signature_url) {
          const { data } = await supabase.storage
            .from("signatures")
            .createSignedUrl(r.signature_url, 3600);
          if (data?.signedUrl) {
            urls[r.id] = data.signedUrl;
          }
        }
      }
      setSignatureUrls(urls);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const worker = {
    name: profile?.name ?? "",
    rrnFront: profile?.rrn_front ?? "",
    rrnBack: profile?.rrn_back ?? "",
    phone: profile?.phone ?? "",
    region: profile?.region ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계약서</h1>
          <p className="mt-1 text-sm text-muted-foreground">서명된 계약서를 확인하세요.</p>
        </div>
        {signedRecords.length > 0 && (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-0 font-semibold">
            <FileSignature className="mr-1 h-3 w-3" />
            {signedRecords.length}건 완료
          </Badge>
        )}
      </div>

      {/* List */}
      {signedRecords.length === 0 ? (
        <Card className="py-0">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="font-medium">서명된 계약서가 없습니다.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              급여신청에서 전자서명을 완료하면 계약서가 생성됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0 divide-y">
            {signedRecords.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.work_date)} | 실수령 {formatCurrency(r.net_pay)}
                  </p>
                  <Badge className="mt-1 bg-emerald-500/10 text-emerald-700 text-[10px] font-semibold border-0">
                    서명 완료
                  </Badge>
                </div>
                <ContractViewModal
                  record={r}
                  worker={worker}
                  signatureUrl={signatureUrls[r.id] ?? null}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ContractsPage() {
  return (
    <AuthGuard>
      <ContractsContent />
    </AuthGuard>
  );
}

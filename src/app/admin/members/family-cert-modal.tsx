"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Member } from "@/lib/supabase/queries";
import { getMemberFamilyCert } from "./actions";

type CertState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; url: string; uploadedAt: string | null };

interface FamilyCertModalProps {
  member: Member;
  onOpenChange: (open: boolean) => void;
}

export function FamilyCertModal({ member, onOpenChange }: FamilyCertModalProps) {
  const [state, setState] = useState<CertState>({ status: "loading" });
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMemberFamilyCert(member.id)
      .then((res) => {
        if (cancelled) return;
        if (res.error) setState({ status: "error", message: res.error });
        else if (!res.url) setState({ status: "error", message: "등록된 가족관계증명서가 없습니다." });
        else setState({ status: "ready", url: res.url, uploadedAt: res.uploadedAt ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "가족관계증명서를 불러오지 못했어요." });
      });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member.name ?? "회원"} - 가족관계증명서</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {state.status === "loading" && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          )}

          {state.status === "error" && (
            <p className="py-12 text-center text-sm text-red-600">{state.message}</p>
          )}

          {state.status === "ready" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  업로드일:{" "}
                  <span className="font-medium text-foreground">
                    {state.uploadedAt
                      ? new Date(state.uploadedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
                      : "-"}
                  </span>
                </p>
                <a
                  href={state.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                >
                  새 탭에서 열기
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {imageFailed ? (
                <p className="rounded-lg border bg-slate-50 px-3 py-8 text-center text-sm text-muted-foreground">
                  미리보기를 표시할 수 없는 형식입니다. 새 탭에서 열어 확인해 주세요.
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <img
                    src={state.url}
                    alt="가족관계증명서"
                    className="w-full h-auto"
                    onError={() => setImageFailed(true)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

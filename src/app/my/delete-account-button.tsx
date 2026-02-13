"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserX, AlertTriangle } from "lucide-react";
import { deleteAccount } from "./actions";

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    const res = await deleteAccount();

    if (res.success) {
      router.push("/login");
    } else {
      setError(res.error ?? "탈퇴 처리에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <>
      <Badge
        variant="secondary"
        className="cursor-pointer gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-50 hover:text-red-600"
        onClick={() => setOpen(true)}
      >
        <UserX className="h-3 w-3" />
        회원탈퇴
      </Badge>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) setOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              정말 탈퇴하시겠습니까?
            </DialogTitle>
            <DialogDescription>
              탈퇴 시 모든 회원정보, 지원내역, 근무내역, 급여내역이
              영구적으로 삭제되며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              탈퇴하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

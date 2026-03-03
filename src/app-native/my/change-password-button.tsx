"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Settings, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/lib/native-api/actions";

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleSubmit = async () => {
    setError("");

    if (!currentPassword) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("새 비밀번호는 6자리 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const res = await changePassword(currentPassword, newPassword);

    if (res.success) {
      toast.success("비밀번호가 변경되었습니다.");
      resetForm();
      setOpen(false);
    } else {
      setError(res.error ?? "비밀번호 변경에 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <>
      <Badge
        variant="secondary"
        className="cursor-pointer gap-1.5 rounded-none px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-slate-200"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-3 w-3" />
        비밀번호 수정
      </Badge>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) { setOpen(v); if (!v) resetForm(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>
              현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="현재 비밀번호"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="새 비밀번호 (6자리 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="새 비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }} disabled={loading}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              변경하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

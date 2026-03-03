"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Member } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils/format";

interface HealthCertModalProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HealthCertModal({ member, open, onOpenChange }: HealthCertModalProps) {
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member.name ?? "회원"} - 보건증</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {member.health_cert_date && (
            <p className="text-sm text-muted-foreground">
              진단일: <span className="font-medium text-foreground">{formatDate(member.health_cert_date)}</span>
            </p>
          )}

          {member.health_cert_image_url && (
            <div className="rounded-lg border overflow-hidden">
              <img
                src={member.health_cert_image_url}
                alt="보건증"
                className="w-full h-auto"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

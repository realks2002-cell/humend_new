"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Phone, MapPin, Calendar, Briefcase, CreditCard } from "lucide-react";
import type { Member } from "@/lib/supabase/queries";
import { formatPhone } from "@/lib/utils/format";

interface MemberDetailModalProps {
  member: Member | null;
  profileImageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function MemberDetailModal({ member, profileImageUrl, open, onOpenChange }: MemberDetailModalProps) {
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>회원 상세 정보</DialogTitle>
        </DialogHeader>

        {/* Profile photo + name */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {profileImageUrl ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-muted">
              <Image
                src={profileImageUrl}
                alt={member.name ?? "프로필"}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {member.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold">{member.name ?? "-"}</p>
            <Badge variant={member.status === "active" ? "default" : "secondary"} className="mt-1">
              {member.status === "active" ? "활성" : "비활성"}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Detail info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow icon={Phone} label="전화번호" value={formatPhone(member.phone)} />
          <InfoRow icon={MapPin} label="지역" value={member.region ?? "-"} />
          <InfoRow icon={Calendar} label="생년월일" value={member.birth_date ?? "-"} />
          <InfoRow icon={User} label="성별" value={member.gender ?? "-"} />
          <InfoRow
            icon={Briefcase}
            label="경험"
            value={member.has_experience ? (member.experience_detail ?? "있음") : "없음"}
          />
          <InfoRow
            icon={Calendar}
            label="가입일"
            value={member.created_at ? new Date(member.created_at).toLocaleDateString("ko-KR") : "-"}
          />
        </div>

        {/* Bank info */}
        {member.bank_name && (
          <>
            <Separator />
            <InfoRow
              icon={CreditCard}
              label="계좌 정보"
              value={`${member.bank_name} ${member.account_number ?? ""} (${member.account_holder ?? ""})`}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

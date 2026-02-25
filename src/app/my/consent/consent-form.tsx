"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { type Member } from "@/lib/supabase/queries";
import { submitConsent } from "./actions";
import { toast } from "sonner";

interface ConsentFormProps {
  profile: Member;
}

function formatPhone(phone: string) {
  const raw = phone.replace(/\D/g, "");
  if (raw.length === 11) return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
  if (raw.length === 10) return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  return phone;
}

function formatBirthDate(date: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function ConsentForm({ profile }: ConsentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    guardianName: "",
    guardianPhone: "",
    guardianRelationship: "",
  });

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSign(signatureDataUrl: string) {
    if (!form.guardianName.trim()) {
      toast.error("친권자 성명을 입력해주세요.");
      return;
    }
    if (!form.guardianPhone.trim()) {
      toast.error("친권자 연락처를 입력해주세요.");
      return;
    }
    if (!form.guardianRelationship.trim()) {
      toast.error("연소근로자와의 관계를 입력해주세요.");
      return;
    }

    setLoading(true);
    const result = await submitConsent({
      guardianName: form.guardianName,
      guardianPhone: form.guardianPhone,
      guardianRelationship: form.guardianRelationship,
      signatureDataUrl,
    });
    setLoading(false);

    if (result.error) {
      toast.error("제출 실패", { description: result.error });
      return;
    }
    toast.success("친권자 동의서가 제출되었습니다.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-center">
        친권자 (후견인) 동의서
      </h1>

      {/* 친권자 인적사항 */}
      <Card className="overflow-hidden py-0">
        <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
          ■ 친권자 (후견인) 인적사항
        </div>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="guardianName">성 명</Label>
            <Input
              id="guardianName"
              placeholder="친권자 성명을 입력하세요"
              value={form.guardianName}
              onChange={(e) => handleChange("guardianName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardianPhone">연 락 처</Label>
            <Input
              id="guardianPhone"
              type="tel"
              placeholder="010-0000-0000"
              value={form.guardianPhone}
              onChange={(e) => handleChange("guardianPhone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardianRelationship">연소근로자와의 관계</Label>
            <Input
              id="guardianRelationship"
              placeholder="예: 부, 모, 후견인"
              value={form.guardianRelationship}
              onChange={(e) => handleChange("guardianRelationship", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 연소근로자 인적사항 */}
      <Card className="overflow-hidden py-0">
        <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
          ■ 연소근로자 인적사항
        </div>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center px-5 py-3">
              <span className="w-24 text-sm text-muted-foreground shrink-0">성 명</span>
              <span className="text-sm font-medium">{profile.name ?? "-"}</span>
            </div>
            <div className="flex items-center px-5 py-3">
              <span className="w-24 text-sm text-muted-foreground shrink-0">생년월일</span>
              <span className="text-sm font-medium">{formatBirthDate(profile.birth_date)}</span>
            </div>
            <div className="flex items-center px-5 py-3">
              <span className="w-24 text-sm text-muted-foreground shrink-0">연 락 처</span>
              <span className="text-sm font-medium">{formatPhone(profile.phone)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 동의 문구 */}
      <div className="rounded-lg border bg-slate-50 p-5 text-center">
        <p className="text-sm leading-relaxed">
          본인은 위 연소근로자 <strong className="text-base">{profile.name ?? "___"}</strong>가
          (주)휴멘드에서 제공하는 사업장에서 근로를 하는 것에 대하여 동의합니다.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{dateStr}</p>
      </div>

      {/* 서명 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">보호자 성명:</span>
          <span className="text-sm">{form.guardianName || "_______________"}</span>
          <span className="ml-auto text-sm font-semibold">서명란</span>
        </div>
        <SignaturePad onSave={handleSign} loading={loading} />
      </div>
    </div>
  );
}

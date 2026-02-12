"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Camera, Save, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import { saveResume, getResume } from "./actions";

export default function ResumePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [identityVerified, setIdentityVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [memberPhone, setMemberPhone] = useState("");
  const [memberName, setMemberName] = useState("");
  const [form, setForm] = useState({
    birthDate: "",
    gender: "",
    region: "",
    hasExperience: "",
    experience: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    rrnFront: "",
    rrnBack: "",
    height: "",
    email: "",
  });
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await getResume();

      if (data) {
        if (data.profile_image_url) {
          const supabase = createClient();
          const { data: signedData } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(data.profile_image_url, 3600);
          if (signedData?.signedUrl) {
            setProfileImageUrl(signedData.signedUrl);
          }
        }
        setMemberPhone(data.phone ?? "");
        setMemberName(data.name ?? "");
        setIdentityVerified(data.identity_verified ?? false);
        setForm({
          birthDate: data.birth_date ?? "",
          gender: data.gender ?? "",
          region: data.region ?? "",
          hasExperience: data.has_experience ? "yes" : "no",
          experience: data.experience_detail ?? "",
          bankName: data.bank_name ?? "",
          accountHolder: data.account_holder ?? "",
          accountNumber: data.account_number ?? "",
          rrnFront: data.rrn_front ?? "",
          rrnBack: data.rrn_back ?? "",
          height: data.height ? String(data.height) : "",
          email: data.email ?? "",
        });
        setPrivacyAgreed(data.privacy_agreed ?? false);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      // 1.5MB 이하로 압축
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = compressed.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/profile.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, compressed, { upsert: true });

      if (uploadError) {
        setMessage("사진 업로드에 실패했습니다.");
        setUploading(false);
        return;
      }

      await supabase
        .from("members")
        .update({ profile_image_url: filePath })
        .eq("id", user.id);

      const { data: signedData } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(filePath, 3600);

      if (signedData?.signedUrl) {
        setProfileImageUrl(signedData.signedUrl);
      }
      setMessage("프로필 사진이 업로드되었습니다.");
    } catch {
      setMessage("사진 처리에 실패했습니다.");
    }
    setUploading(false);
  };

  const fieldMap: { key: string; label: string; id: string }[] = [
    { key: "birthDate", label: "생년월일", id: "field-birthDate" },
    { key: "gender", label: "성별", id: "field-gender" },
    { key: "region", label: "거주지역", id: "field-region" },
    { key: "height", label: "키", id: "field-height" },
    { key: "email", label: "이메일", id: "field-email" },
    { key: "rrnFront", label: "주민등록번호 앞자리", id: "field-rrnFront" },
    { key: "rrnBack", label: "주민등록번호 뒷자리", id: "field-rrnBack" },
    { key: "bankName", label: "은행명", id: "field-bankName" },
    { key: "accountHolder", label: "예금주", id: "field-accountHolder" },
    { key: "accountNumber", label: "계좌번호", id: "field-accountNumber" },
  ];

  const scrollToField = (id: string) => {
    setShowValidationModal(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 200);
  };

  const handleSave = async () => {
    setMessage("");

    // Validation
    const errors: { label: string; id: string }[] = [];
    for (const f of fieldMap) {
      const value = form[f.key as keyof typeof form];
      if (!value || !value.trim()) {
        errors.push({ label: f.label, id: f.id });
      }
    }
    if (!privacyAgreed) {
      errors.push({ label: "개인정보 수집 동의", id: "field-privacy" });
    }

    if (errors.length > 0) {
      setValidationErrors(errors.map((e) => e.label));
      setShowValidationModal(true);
      return;
    }

    setSaving(true);

    try {
      const result = await saveResume({
        ...form,
        identityVerified,
        privacyAgreed,
      });

      if (result.error) {
        setMessage(`저장에 실패했습니다: ${result.error}`);
      } else {
        setMessage("회원정보가 저장되었습니다.");
        router.refresh();
      }
    } catch (err) {
      setMessage(`저장 중 오류가 발생했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">회원정보 관리</h1>
      <p className="mt-1 text-muted-foreground">
        회원정보를 등록하면 채용공고에 지원할 수 있습니다.
      </p>

      {message && (
        <div className={`mt-4 rounded-md p-3 text-sm ${message.includes("실패") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {message}
        </div>
      )}

      {/* 프로필 사진 */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="relative">
          <div className="flex h-36 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="프로필" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl text-muted-foreground">
                {memberName ? memberName[0] : "?"}
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <button
            className="absolute bottom-1 right-1 rounded-full border bg-background p-1.5 shadow-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
        </div>
        <span className="text-sm font-semibold">사진등록</span>
      </div>

      {/* 기본 정보 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">이름</label>
              <Input
                value={memberName}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">전화번호</label>
              <Input
                value={memberPhone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                readOnly
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">생년월일</label>
              <Input
                id="field-birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">성별</label>
              <div id="field-gender" className="flex gap-2" tabIndex={-1}>
                <Button
                  type="button"
                  variant={form.gender === "male" ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 ${form.gender === "male" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  onClick={() => handleChange("gender", "male")}
                >
                  남성
                </Button>
                <Button
                  type="button"
                  variant={form.gender === "female" ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 ${form.gender === "female" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  onClick={() => handleChange("gender", "female")}
                >
                  여성
                </Button>
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">이메일</label>
            <Input
              id="field-email"
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">거주지역</label>
              <Input
                id="field-region"
                placeholder="서울 강남구"
                value={form.region}
                onChange={(e) => handleChange("region", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">키 (cm)</label>
              <Input
                id="field-height"
                type="number"
                placeholder="170"
                value={form.height}
                onChange={(e) => handleChange("height", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 신원 인증 */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">신원 인증</CardTitle>
            {identityVerified ? (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <ShieldCheck className="mr-1 h-3 w-3" />
                인증완료
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                미인증
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">주민등록번호</label>
            <div className="flex items-center gap-2">
              <Input
                id="field-rrnFront"
                placeholder="앞 6자리"
                maxLength={6}
                value={form.rrnFront}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  handleChange("rrnFront", v);
                }}
                disabled={identityVerified}
              />
              <span className="text-muted-foreground">-</span>
              <Input
                id="field-rrnBack"
                type="password"
                placeholder="뒤 7자리"
                maxLength={7}
                value={form.rrnBack}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 7);
                  handleChange("rrnBack", v);
                }}
                disabled={identityVerified}
              />
            </div>
          </div>

          <Separator />

          <div>
            <label className="mb-1.5 block text-sm font-medium">NICE 신용평가 본인인증</label>
            <p className="mb-3 text-xs text-muted-foreground">
              휴대폰 본인인증을 통해 신원을 확인합니다. (개발모드: 버튼 클릭 시 인증완료 처리)
            </p>
            {identityVerified ? (
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                <ShieldCheck className="h-4 w-4" />
                본인인증이 완료되었습니다.
              </div>
            ) : (
              <Button
                type="button"
                className="w-full bg-orange-500 text-white hover:bg-orange-600"
                disabled={verifying || !form.rrnFront || !form.rrnBack || form.rrnFront.length !== 6 || form.rrnBack.length !== 7}
                onClick={() => {
                  // 개발모드: 실제 NICE API 연동 없이 인증완료 처리
                  setVerifying(true);
                  setTimeout(() => {
                    setIdentityVerified(true);
                    setVerifying(false);
                    setMessage("본인인증이 완료되었습니다. (개발모드)");
                  }, 1500);
                }}
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    인증 처리 중...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    NICE 본인인증 하기
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 경험 */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">경험</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">관련 경험 유무</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.hasExperience === "yes" ? "default" : "outline"}
                size="sm"
                className={form.hasExperience === "yes" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => handleChange("hasExperience", "yes")}
              >
                있음
              </Button>
              <Button
                type="button"
                variant={form.hasExperience === "no" ? "default" : "outline"}
                size="sm"
                className={form.hasExperience === "no" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => handleChange("hasExperience", "no")}
              >
                없음
              </Button>
            </div>
          </div>
          {form.hasExperience === "yes" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">경험 내용</label>
              <Input
                placeholder="웨딩홀 서빙 6개월, 케이터링 보조 3개월 등"
                value={form.experience}
                onChange={(e) => handleChange("experience", e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 은행 계좌 */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">급여 계좌</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">은행명</label>
            <Select value={form.bankName} onValueChange={(value) => handleChange("bankName", value)}>
              <SelectTrigger id="field-bankName">
                <SelectValue placeholder="은행을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="국민은행">국민은행</SelectItem>
                <SelectItem value="신한은행">신한은행</SelectItem>
                <SelectItem value="하나은행">하나은행</SelectItem>
                <SelectItem value="우리은행">우리은행</SelectItem>
                <SelectItem value="NH농협은행">NH농협은행</SelectItem>
                <SelectItem value="IBK기업은행">IBK기업은행</SelectItem>
                <SelectItem value="카카오뱅크">카카오뱅크</SelectItem>
                <SelectItem value="토스뱅크">토스뱅크</SelectItem>
                <SelectItem value="케이뱅크">케이뱅크</SelectItem>
                <SelectItem value="SC제일은행">SC제일은행</SelectItem>
                <SelectItem value="씨티은행">씨티은행</SelectItem>
                <SelectItem value="대구은행">대구은행</SelectItem>
                <SelectItem value="부산은행">부산은행</SelectItem>
                <SelectItem value="경남은행">경남은행</SelectItem>
                <SelectItem value="광주은행">광주은행</SelectItem>
                <SelectItem value="전북은행">전북은행</SelectItem>
                <SelectItem value="제주은행">제주은행</SelectItem>
                <SelectItem value="수협은행">수협은행</SelectItem>
                <SelectItem value="새마을금고">새마을금고</SelectItem>
                <SelectItem value="신협">신협</SelectItem>
                <SelectItem value="우체국">우체국</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">예금주</label>
            <Input
              id="field-accountHolder"
              placeholder="홍길동"
              value={form.accountHolder}
              onChange={(e) => handleChange("accountHolder", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">계좌번호</label>
            <Input
              id="field-accountNumber"
              placeholder="0000-0000-0000-00"
              value={form.accountNumber.replace(/[^0-9]/g, "").replace(/(\d{4})(?=\d)/g, "$1-")}
              onChange={(e) => handleChange("accountNumber", e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 개인정보 수집 및 이용 동의 */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">개인정보 수집 및 이용 동의</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              회사는 「개인정보 보호법」 등 관련 법령에 따라 회원정보 등록을 위해 아래와 같이 개인정보를 수집·이용합니다.
            </p>
            <p className="mt-2 font-medium text-foreground">수집 목적</p>
            <ul className="ml-4 list-disc">
              <li>채용 지원 및 인재풀 관리</li>
              <li>채용 관련 안내 및 연락</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">수집 항목</p>
            <ul className="ml-4 list-disc">
              <li>필수 항목: 이름, 성별, 생년월일, 연락처(전화번호, 이메일), 거주지역, 주민등록번호, 키 등 회원정보에 기재한 정보</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">보유 및 이용 기간</p>
            <ul className="ml-4 list-disc">
              <li>회원정보 등록일로부터 회원 탈퇴 또는 회원정보 삭제 시까지 보관</li>
              <li>단, 관계 법령에 따라 보존이 필요한 경우 해당 법령에서 정한 기간 동안 보관</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">동의 거부 권리 및 불이익 안내</p>
            <ul className="ml-4 list-disc">
              <li>개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다.</li>
              <li>다만, 동의를 거부할 경우 회원정보 등록 및 채용 지원 서비스 이용이 제한될 수 있습니다.</li>
            </ul>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              id="field-privacy"
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">
              위 개인정보 수집 및 이용에 동의합니다.
            </span>
          </label>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Button className="w-full bg-orange-500 hover:bg-orange-600" size="lg" onClick={handleSave} disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {saving ? "제출 중..." : "제출하기"}
      </Button>
      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              입력되지 않은 항목이 있습니다
            </DialogTitle>
            <DialogDescription>
              아래 항목을 모두 입력해야 제출할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {validationErrors.map((label) => {
              const field = fieldMap.find((f) => f.label === label);
              const fieldId = field?.id ?? (label === "개인정보 수집 동의" ? "field-privacy" : "");
              return (
                <button
                  key={label}
                  className="flex w-full items-center gap-2 rounded-md border p-2.5 text-sm text-left transition-colors hover:bg-muted"
                  onClick={() => scrollToField(fieldId)}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                  {label}
                </button>
              );
            })}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="w-full mt-2">닫기</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}

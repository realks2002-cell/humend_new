"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Camera, Save, Loader2, ShieldCheck, AlertTriangle, User, CreditCard, Briefcase, FileCheck, CheckCircle2 } from "lucide-react";
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await getResume();

      if (data) {
        if (data.profile_image_url) {
          // Vercel Blob URL은 signed URL 필요 없음
          setProfileImageUrl(data.profile_image_url);
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
      let uploadFile: File | Blob = file;
      try {
        uploadFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
          initialQuality: 0.85,
        });
      } catch {
        // 압축 실패 시 원본 파일 사용
        uploadFile = file;
      }

      // Vercel Blob API 호출
      const formData = new FormData();
      formData.append("photo", uploadFile, file.name);

      const response = await fetch("/api/upload-profile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "업로드 실패");
      }

      const { url } = await response.json();
      setProfileImageUrl(url);
      setMessage("프로필 사진이 업로드되었습니다.");
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setMessage("서버 연결 실패: 개발 서버를 재시작해주세요.");
      } else {
        setMessage(`업로드 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
      }
    }
    setUploading(false);
  };

  const fieldMap: { key: string; label: string; id: string }[] = [
    { key: "profilePhoto", label: "프로필 사진", id: "field-profilePhoto" },
    { key: "birthDate", label: "생년월일", id: "field-birthDate" },
    { key: "gender", label: "성별", id: "field-gender" },
    { key: "region", label: "거주지역", id: "field-region" },
    { key: "height", label: "키", id: "field-height" },
    { key: "email", label: "이메일", id: "field-email" },
    { key: "rrnFront", label: "주민등록번호 앞자리", id: "field-rrnFront" },
    { key: "rrnBack", label: "주민등록번호 뒷자리", id: "field-rrnBack" },
    { key: "hasExperience", label: "관련 경험 유무", id: "field-hasExperience" },
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

    const errors: { label: string; id: string }[] = [];
    for (const f of fieldMap) {
      if (f.key === "profilePhoto") {
        if (!profileImageUrl) {
          errors.push({ label: f.label, id: f.id });
        }
        continue;
      }
      const value = form[f.key as keyof typeof form];
      if (!value || !value.trim()) {
        errors.push({ label: f.label, id: f.id });
      }
    }
    if (!identityVerified) {
      errors.push({ label: "NICE 본인인증", id: "field-identity" });
    }
    if (form.hasExperience === "yes" && !form.experience.trim()) {
      errors.push({ label: "경험 내용", id: "field-experience" });
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
        setShowSuccessModal(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      if (msg.includes("Server Action") || msg.includes("not found")) {
        setMessage("세션이 만료되었습니다. 페이지를 새로고침 해주세요.");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage(`저장 중 오류가 발생했습니다: ${msg}`);
      }
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
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">회원정보 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회원정보를 등록하면 채용공고에 지원할 수 있습니다.
        </p>
      </div>

      {message && (
        <div className={`rounded-xl p-3.5 text-sm font-medium ${message.includes("실패") || message.includes("오류") ? "bg-red-50 text-red-600 border border-red-200/50" : "bg-emerald-50 text-emerald-600 border border-emerald-200/50"}`}>
          {message}
        </div>
      )}

      {/* Profile Photo */}
      <div id="field-profilePhoto" className="flex flex-col items-center gap-3" tabIndex={-1}>
        <div className="relative">
          <div className="flex h-28 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-slate-100 to-slate-200 shadow-md">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="프로필" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-medium text-muted-foreground">
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
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-sm transition-colors hover:bg-blue-600"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-white" />
            )}
          </button>
        </div>
        <span className="text-xs font-semibold text-foreground">사진등록</span>
      </div>

      {/* Section: Basic Info */}
      <Card className="overflow-hidden py-0">
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 px-5 py-3 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <User className="h-4 w-4 text-white" />
          </div>
          <h2 className="font-semibold text-sm">기본 정보</h2>
        </div>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">이름</label>
              <Input value={memberName} readOnly disabled className="bg-muted/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">전화번호</label>
              <Input
                value={memberPhone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                readOnly disabled className="bg-muted/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">생년월일</label>
              <Input
                id="field-birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">성별</label>
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
            <label className="mb-1.5 block text-xs font-semibold text-foreground">이메일</label>
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
              <label className="mb-1.5 block text-xs font-semibold text-foreground">거주지역</label>
              <Input
                id="field-region"
                placeholder="서울 강남구"
                value={form.region}
                onChange={(e) => handleChange("region", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">키 (cm)</label>
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

      {/* Section: Identity Verification */}
      <Card className="overflow-hidden py-0">
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50/50 px-5 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-semibold text-sm">신원 인증</h2>
          </div>
          {identityVerified ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-0 font-semibold">
              <ShieldCheck className="mr-1 h-3 w-3" />
              인증완료
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">미인증</Badge>
          )}
        </div>
        <CardContent className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">주민등록번호</label>
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
              <span className="text-muted-foreground font-bold">-</span>
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

          <div id="field-identity" className="border-t pt-4" tabIndex={-1}>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">NICE 신용평가 본인인증</label>
            <p className="mb-3 text-xs text-muted-foreground">
              휴대폰 본인인증을 통해 신원을 확인합니다. (개발모드: 버튼 클릭 시 인증완료 처리)
            </p>
            {identityVerified ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-700 font-medium">
                <ShieldCheck className="h-4 w-4" />
                본인인증이 완료되었습니다.
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold hover:from-amber-600 hover:to-orange-600 hover:text-black disabled:opacity-70"
                disabled={verifying}
                onClick={() => {
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

      {/* Section: Experience */}
      <Card className="overflow-hidden py-0">
        <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-purple-50/50 px-5 py-3 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <h2 className="font-semibold text-sm">경험</h2>
        </div>
        <CardContent className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">관련 경험 유무</label>
            <div id="field-hasExperience" className="flex gap-2" tabIndex={-1}>
              <Button
                type="button"
                variant={form.hasExperience === "yes" ? "default" : "outline"}
                size="sm"
                className={form.hasExperience === "yes" ? "bg-violet-600 hover:bg-violet-700" : ""}
                onClick={() => handleChange("hasExperience", "yes")}
              >
                있음
              </Button>
              <Button
                type="button"
                variant={form.hasExperience === "no" ? "default" : "outline"}
                size="sm"
                className={form.hasExperience === "no" ? "bg-violet-600 hover:bg-violet-700" : ""}
                onClick={() => handleChange("hasExperience", "no")}
              >
                없음
              </Button>
            </div>
          </div>
          {form.hasExperience === "yes" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">경험 내용</label>
              <Input
                id="field-experience"
                placeholder="웨딩홀 서빙 6개월, 케이터링 보조 3개월 등"
                value={form.experience}
                onChange={(e) => handleChange("experience", e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section: Bank Account */}
      <Card className="overflow-hidden py-0">
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50/50 px-5 py-3 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <CreditCard className="h-4 w-4 text-white" />
          </div>
          <h2 className="font-semibold text-sm">급여 계좌</h2>
        </div>
        <CardContent className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">은행명</label>
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
            <label className="mb-1.5 block text-xs font-semibold text-foreground">예금주</label>
            <Input
              id="field-accountHolder"
              placeholder="홍길동"
              value={form.accountHolder}
              onChange={(e) => handleChange("accountHolder", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">계좌번호</label>
            <Input
              id="field-accountNumber"
              placeholder="숫자와 - 만 입력"
              value={form.accountNumber}
              onChange={(e) => handleChange("accountNumber", e.target.value.replace(/[^0-9-]/g, ""))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section: Privacy */}
      <Card className="overflow-hidden py-0">
        <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-gray-50/50 px-5 py-3 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-gray-600">
            <FileCheck className="h-4 w-4 text-white" />
          </div>
          <h2 className="font-semibold text-sm">개인정보 수집 및 이용 동의</h2>
        </div>
        <CardContent className="space-y-3 p-5">
          <div className="max-h-48 overflow-y-auto rounded-xl border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              당사는 「개인정보 보호법」제24조, 「소득세법」제164조 등 관련 법령에 따라 회원정보 등록을 위해 아래와 같이 개인정보를 수집·이용합니다.
            </p>
            <p className="mt-2 font-semibold text-foreground">수집 목적</p>
            <ul className="ml-4 list-disc">
              <li>채용 지원 및 인재풀 관리</li>
              <li>채용 관련 안내 및 연락</li>
              <li>지급명세 제출 및 고용보험 및 산업재해보상보험의 보험료 징수에 관한 법률 시행규칙 제16조의(서식 22의7)에 의한 근로내용확인 신고</li>
            </ul>
            <p className="mt-2 font-semibold text-foreground">수집 항목</p>
            <ul className="ml-4 list-disc">
              <li>필수 항목: 이름, 성별, 생년월일, 연락처(전화번호, 이메일), 거주지역, 주민등록번호, 키 등 회원정보에 기재한 정보</li>
            </ul>
            <p className="mt-2 font-semibold text-foreground">보유 및 이용 기간</p>
            <ul className="ml-4 list-disc">
              <li>회원정보 등록일로부터 회원 탈퇴 또는 회원정보 삭제 시까지 보관</li>
              <li>단, 관계 법령에 따라 보존이 필요한 경우 해당 법령에서 정한 기간 동안 보관</li>
            </ul>
            <p className="mt-2 font-semibold text-foreground">동의 거부 권리 및 불이익 안내</p>
            <ul className="ml-4 list-disc">
              <li>개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다.</li>
              <li>다만, 동의를 거부할 경우 회원정보 등록 및 채용 지원 서비스 이용이 제한될 수 있습니다.</li>
            </ul>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-colors hover:bg-muted/30">
            <input
              id="field-privacy"
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-blue-600"
            />
            <span className="text-sm font-medium">
              위 개인정보 수집 및 이용에 동의합니다.
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 h-12 text-base font-semibold"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {saving ? "제출 중..." : "제출하기"}
      </Button>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              제출 완료
            </DialogTitle>
            <DialogDescription>
              회원정보가 성공적으로 제출되었습니다.
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full mt-2 rounded-xl"
            onClick={() => {
              setShowSuccessModal(false);
              router.push("/my");
            }}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
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
                  className="flex w-full items-center gap-2.5 rounded-xl border p-3 text-sm text-left transition-colors hover:bg-muted/50"
                  onClick={() => scrollToField(fieldId)}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  {label}
                </button>
              );
            })}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="w-full mt-2 rounded-xl">닫기</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Capacitor 네이티브 앱 전용 — 클라이언트 사이드 mutations
 * RLS로 직접 가능한 작업 + API Bridge 호출
 */
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("로그인이 필요합니다.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

// ========== RLS 직접 작업 ==========

export async function applyToJob(postingId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: member } = await supabase
    .from("members")
    .select("id, birth_date, gender, region, bank_name, account_number")
    .eq("id", user.id)
    .maybeSingle();

  if (!member?.birth_date || !member?.bank_name) {
    return { error: "회원정보를 먼저 등록해주세요." };
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("posting_id", postingId)
    .eq("member_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "취소") {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/native/jobs/reapply`, {
        method: "POST",
        headers,
        body: JSON.stringify({ applicationId: existing.id }),
      });
      const result = await res.json();
      if (result.error) return { error: result.error };
      return { success: true };
    }
    return { error: "이미 지원한 공고입니다." };
  }

  const { error } = await supabase.from("applications").insert({
    posting_id: postingId,
    member_id: user.id,
    status: "대기",
  });

  if (error) return { error: `지원 실패: ${error.message}` };
  return { success: true };
}

export async function saveResume(formData: {
  birthDate: string;
  gender: string;
  region: string;
  hasExperience: string;
  experience: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  rrnFront: string;
  rrnBack: string;
  identityVerified: boolean;
  height: string;
  privacyAgreed: boolean;
  email: string;
  name?: string;
  phone?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const updateData: Record<string, unknown> = {
    birth_date: formData.birthDate || null,
    gender: formData.gender || null,
    region: formData.region || null,
    has_experience: formData.hasExperience === "yes",
    experience_detail: formData.experience || null,
    bank_name: formData.bankName || null,
    account_holder: formData.accountHolder || null,
    account_number: formData.accountNumber || null,
    rrn_front: formData.rrnFront || null,
    rrn_back: formData.rrnBack || null,
    identity_verified: formData.identityVerified,
    height: formData.height ? parseInt(formData.height) : null,
    privacy_agreed: formData.privacyAgreed,
    email: formData.email || null,
  };
  if (formData.name) updateData.name = formData.name;
  if (formData.phone) updateData.phone = formData.phone;

  const { data: updated, error } = await supabase
    .from("members")
    .update(updateData)
    .eq("id", user.id)
    .select();

  if (error) return { error: `저장 실패: ${error.message}` };

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase.from("members").insert({
      id: user.id,
      phone:
        formData.phone ||
        (user.user_metadata?.phone as string) ||
        user.email?.split("@")[0]?.slice(0, 20) ||
        "",
      name:
        formData.name || (user.user_metadata?.name as string) || "",
      ...updateData,
    });
    if (insertError) return { error: `저장 실패: ${insertError.message}` };
  }

  return { success: true };
}

export async function getResume() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다.", data: null };

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("id", user.id)
    .single();

  return { data };
}

// ========== API Bridge 호출 ==========

export async function cancelApplication(applicationId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/my/cancel-application`, {
    method: "POST",
    headers,
    body: JSON.stringify({ applicationId }),
  });
  return res.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/auth/change-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return res.json();
}

export async function deleteAccount() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/auth/delete-account`, {
    method: "POST",
    headers,
  });
  return res.json();
}

export async function submitSignature(
  workRecordId: string,
  signatureDataUrl: string,
  workInfo?: {
    work_date: string;
    start_time: string;
    end_time: string;
    wage_type?: string;
    daily_wage?: number;
  }
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/my/submit-signature`, {
    method: "POST",
    headers,
    body: JSON.stringify({ workRecordId, signatureDataUrl, workInfo }),
  });
  return res.json();
}

export async function submitDirectSalary(input: {
  clientName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  wageType: "시급" | "일급";
  wageAmount: number;
  signatureDataUrl: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/my/submit-direct-salary`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function submitConsent(input: {
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
  signatureDataUrl: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/my/submit-consent`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function revokeConsent() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/native/my/revoke-consent`, {
    method: "POST",
    headers,
  });
  return res.json();
}

export async function uploadProfilePhoto(file: File) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: "로그인이 필요합니다." };

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/native/my/upload-profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });
  return res.json();
}

export async function verifyIdentity(
  name: string,
  rrnFront: string,
  rrnBack: string,
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/verify-identity`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, rrnFront, rrnBack }),
  });
  return res.json();
}

export async function submitPartnerInquiry(input: {
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  email?: string;
  content: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("partner_inquiries").insert({
    company_name: input.companyName,
    contact_person: input.contactPerson,
    contact_phone: input.contactPhone,
    email: input.email || null,
    content: input.content,
    status: "대기",
  });

  if (error) return { error: `문의 등록 실패: ${error.message}` };
  return { success: true };
}

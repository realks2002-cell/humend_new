import { createClient, createAdminClient } from "@/lib/supabase/server";

// ========== 타입 ==========

export interface Client {
  id: string;
  company_name: string;
  location: string;
  contact_person: string;
  contact_phone: string;
  hourly_wage: number;
  main_image_url: string | null;
  description: string | null;
  dress_code: string | null;
  work_guidelines: string | null;
  latitude: number | null;
  longitude: number | null;
  total_headcount: number | null;
  work_type: string | null;
  gender_requirement: string | null;
  application_method: string | null;
  work_category: string | null;
  status: string;
}

export interface ClientPhoto {
  id: string;
  client_id: string;
  image_url: string;
  sort_order: number;
}

export interface JobPosting {
  id: string;
  client_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  headcount: number;
  status: string;
}

export interface ClientWithJobs extends Client {
  job_postings: JobPosting[];
  client_photos?: ClientPhoto[];
}

export interface Application {
  id: string;
  posting_id: string;
  member_id: string;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  admin_memo: string | null;
  job_postings: {
    id: string;
    work_date: string;
    start_time: string;
    end_time: string;
    headcount: number;
    clients: {
      company_name: string;
      location: string;
      hourly_wage: number;
    };
  };
}

export interface Member {
  id: string;
  phone: string;
  name: string | null;
  birth_date: string | null;
  gender: string | null;
  region: string | null;
  has_experience: boolean;
  experience_detail: string | null;
  profile_image_url: string | null;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  status: string;
  created_at: string;
}

export interface WorkRecord {
  id: string;
  member_id: string;
  posting_id: string;
  application_id: string | null;
  client_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  hourly_wage: number;
  work_hours: number;
  overtime_hours: number;
  base_pay: number;
  overtime_pay: number;
  weekly_holiday_pay: number;
  gross_pay: number;
  national_pension: number;
  health_insurance: number;
  long_term_care: number;
  employment_insurance: number;
  total_deduction: number;
  net_pay: number;
  status: string;
  signature_url: string | null;
  contract_pdf_url: string | null;
  wage_type: string | null;
  signed_at: string | null;
  admin_memo: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  members?: { name: string; phone: string; bank_name: string | null; account_number: string | null };
  payments?: Payment | null;
}

export interface Payment {
  id: string;
  work_record_id: string;
  hourly_wage: number;
  work_hours: number;
  overtime_hours: number;
  base_pay: number;
  overtime_pay: number;
  weekly_holiday_pay: number;
  gross_pay: number;
  national_pension: number;
  health_insurance: number;
  long_term_care: number;
  employment_insurance: number;
  total_deduction: number;
  net_pay: number;
  status: string;
  admin_memo: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ========== 퍼블릭 쿼리 ==========

export async function getClientsWithJobs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(`*, job_postings(*)`)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getClientsWithJobs] error:", error.message);
    return [];
  }

  // 클라이언트에서 open 상태 job_postings만 필터
  const result = (data ?? []).map((client) => ({
    ...client,
    job_postings: (client.job_postings ?? []).filter(
      (j: JobPosting) => j.status === "open"
    ),
  })).filter((client) => client.job_postings.length > 0);

  return result as ClientWithJobs[];
}

export async function getClientDetail(clientId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select(`*, job_postings(*), client_photos(*)`)
    .eq("id", clientId)
    .single();

  return data as ClientWithJobs | null;
}

export async function saveClientPhotos(clientId: string, urls: string[]) {
  const admin = createAdminClient();

  // 기존 사진 삭제 (admin으로 RLS 우회)
  await admin.from("client_photos").delete().eq("client_id", clientId);

  if (urls.length === 0) return { error: null };

  const rows = urls.map((url, i) => ({
    client_id: clientId,
    image_url: url,
    sort_order: i,
  }));

  const { error } = await admin.from("client_photos").insert(rows);
  return { error: error?.message ?? null };
}

export async function deleteClientPhoto(photoId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("client_photos").delete().eq("id", photoId);
  return { error: error?.message ?? null };
}

// ========== 회원 쿼리 ==========

export async function getMyProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("members")
    .select("*")
    .eq("id", user.id)
    .limit(1);

  return (data?.[0] as Member) ?? null;
}

export async function getMyApplications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("applications")
    .select(`*, job_postings(*, clients(company_name, location, hourly_wage))`)
    .eq("member_id", user.id)
    .order("applied_at", { ascending: false });

  return (data ?? []) as Application[];
}

export async function updateMyProfile(updates: Partial<Member>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: "저장에 실패했습니다." };
  return { success: true };
}

// ========== 관리자 쿼리 ==========

export async function getAllMembers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as Member[];
}

export async function getAllClients() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as Client[];
}

export async function getAllApplications() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select(`*, job_postings(*, clients(company_name, location, hourly_wage)), members(name, phone)`)
    .order("applied_at", { ascending: false });

  return (data ?? []) as (Application & { members: { name: string; phone: string } })[];
}

export async function getApplicationCounts() {
  const supabase = await createClient();
  const { count: pending } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "대기");

  return { pending: pending ?? 0 };
}

export async function getAllClientsWithJobs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select(`*, job_postings(*)`)
    .order("created_at", { ascending: false });

  return (data ?? []) as ClientWithJobs[];
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "승인" | "거절"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  return { error: error?.message ?? null };
}

// ========== 근무내역(급여) 쿼리 ==========

export async function createWorkRecord(record: Omit<WorkRecord, "id" | "created_at" | "updated_at" | "members">) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_records")
    .insert(record)
    .select()
    .single();

  return { data: data as WorkRecord | null, error: error?.message ?? null };
}

export async function getMyWorkRecords(month?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("work_records")
    .select("*, payments(*)")
    .eq("member_id", user.id)
    .order("work_date", { ascending: false });

  if (month) {
    const start = `${month}-01`;
    const endDate = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0);
    const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;
    query = query.gte("work_date", start).lte("work_date", end);
  }

  const { data } = await query;
  // payments is 1:1 via UNIQUE — Supabase returns array, unwrap to single
  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const rec = r as Record<string, unknown>;
    const payments = Array.isArray(rec.payments) ? rec.payments[0] ?? null : rec.payments ?? null;
    return { ...rec, payments } as WorkRecord;
  });
}

export async function getMyContracts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("work_records")
    .select("*")
    .eq("member_id", user.id)
    .not("contract_pdf_url", "is", null)
    .order("signed_at", { ascending: false });

  return (data ?? []) as WorkRecord[];
}

export async function getAllWorkRecords(filters?: { month?: string; status?: string; signedOnly?: boolean; pendingOnly?: boolean }) {
  const admin = createAdminClient();

  let query = admin
    .from("work_records")
    .select("*, members(name, phone, bank_name, account_number, rrn_front, rrn_back, region), payments(*)")
    .order("work_date", { ascending: false });

  if (filters?.month) {
    const start = `${filters.month}-01`;
    const endDate = new Date(Number(filters.month.split("-")[0]), Number(filters.month.split("-")[1]), 0);
    const end = `${filters.month}-${String(endDate.getDate()).padStart(2, "0")}`;
    query = query.gte("work_date", start).lte("work_date", end);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  // 급여요청(서명) 완료된 건만 조회
  if (filters?.signedOnly) {
    query = query.not("signature_url", "is", null);
  }

  const { data } = await query;
  // payments is 1:1 via UNIQUE — unwrap array to single object
  const results = ((data ?? []) as unknown[]).map((r: unknown) => {
    const rec = r as Record<string, unknown>;
    const payments = Array.isArray(rec.payments) ? rec.payments[0] ?? null : rec.payments ?? null;
    return { ...rec, payments } as WorkRecord;
  });

  // 미처리 급여요청만: 서명 완료 + payment 없음
  if (filters?.pendingOnly) {
    return results.filter((r) => r.signature_url && !r.payments);
  }

  return results;
}

export async function updateWorkRecord(id: string, updates: Partial<WorkRecord>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_records")
    .update(updates)
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function bulkUpdateWorkRecordStatus(ids: string[], status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_records")
    .update({ status })
    .in("id", ids);

  return { error: error?.message ?? null };
}

export async function getWorkRecordStats(month?: string, pendingOnly?: boolean) {
  const supabase = await createClient();

  let query = supabase.from("work_records").select("status, gross_pay, net_pay, signature_url, payments(gross_pay, net_pay, status)");

  if (month) {
    const start = `${month}-01`;
    const endDate = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0);
    const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;
    query = query.gte("work_date", start).lte("work_date", end);
  }

  // 서명 완료된 건만
  query = query.not("signature_url", "is", null);

  const { data } = await query;
  const records = (data ?? []) as Array<{
    status: string;
    gross_pay: number;
    net_pay: number;
    signature_url: string | null;
    payments: Array<{ gross_pay: number; net_pay: number; status: string }> | null;
  }>;

  // 미처리 급여요청만: payment 없는 건
  const filtered = pendingOnly
    ? records.filter((r) => {
        const p = Array.isArray(r.payments) ? r.payments[0] : null;
        return !p;
      })
    : records;

  let totalGross = 0;
  let totalNet = 0;
  let pending = 0;

  for (const r of filtered) {
    totalGross += r.gross_pay ?? 0;
    totalNet += r.net_pay ?? 0;
    pending++;
  }

  return { total: filtered.length, pending, confirmed: 0, paid: 0, totalGross, totalNet };
}

// ========== Payment 쿼리 ==========

export async function createPayment(record: WorkRecord) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      work_record_id: record.id,
      hourly_wage: record.hourly_wage,
      work_hours: record.work_hours,
      overtime_hours: record.overtime_hours,
      base_pay: record.base_pay,
      overtime_pay: record.overtime_pay,
      weekly_holiday_pay: record.weekly_holiday_pay,
      gross_pay: record.gross_pay,
      national_pension: record.national_pension,
      health_insurance: record.health_insurance,
      long_term_care: record.long_term_care,
      employment_insurance: record.employment_insurance,
      total_deduction: record.total_deduction,
      net_pay: record.net_pay,
      status: "확정",
    })
    .select()
    .single();

  return { data: data as Payment | null, error: error?.message ?? null };
}

export async function updatePayment(id: string, updates: Partial<Payment>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function getPaymentByWorkRecordId(workRecordId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("work_record_id", workRecordId)
    .maybeSingle();

  return data as Payment | null;
}

export async function bulkCreatePayments(workRecordIds: string[]) {
  const supabase = await createClient();

  // 이미 payment가 있는 건 제외
  const { data: existing } = await supabase
    .from("payments")
    .select("work_record_id")
    .in("work_record_id", workRecordIds);

  const existingIds = new Set((existing ?? []).map((p) => p.work_record_id));
  const newIds = workRecordIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) return { created: 0, error: null };

  // work_records 조회
  const { data: records } = await supabase
    .from("work_records")
    .select("*")
    .in("id", newIds);

  if (!records || records.length === 0) return { created: 0, error: null };

  const rows = records.map((r) => ({
    work_record_id: r.id,
    hourly_wage: r.hourly_wage,
    work_hours: r.work_hours,
    overtime_hours: r.overtime_hours,
    base_pay: r.base_pay,
    overtime_pay: r.overtime_pay,
    weekly_holiday_pay: r.weekly_holiday_pay,
    gross_pay: r.gross_pay,
    national_pension: r.national_pension,
    health_insurance: r.health_insurance,
    long_term_care: r.long_term_care,
    employment_insurance: r.employment_insurance,
    total_deduction: r.total_deduction,
    net_pay: r.net_pay,
    status: "확정",
  }));

  const { error } = await supabase.from("payments").insert(rows);
  return { created: rows.length, error: error?.message ?? null };
}

export async function bulkUpdatePaymentStatus(ids: string[], status: string, paidAt?: string) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { status };
  if (paidAt) updates.paid_at = paidAt;

  const { error } = await supabase
    .from("payments")
    .update(updates)
    .in("id", ids);

  return { error: error?.message ?? null };
}

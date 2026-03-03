/**
 * Capacitor 네이티브 앱 전용 — Supabase Browser Client로 직접 조회
 * RLS 정책에 의존 (anon key + user JWT)
 */
import { createClient } from "@/lib/supabase/client";
import type {
  ClientWithJobs,
  JobPosting,
  Application,
  Member,
  WorkRecord,
  ParentalConsent,
  Client,
} from "@/lib/supabase/queries";

// Re-export types for convenience
export type { ClientWithJobs, Application, Member, WorkRecord, ParentalConsent, Client };

// ========== 퍼블릭 쿼리 ==========

export async function getClientsWithJobs(): Promise<ClientWithJobs[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(`*, job_postings(*)`)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .order("work_date", { referencedTable: "job_postings", ascending: true });

  if (error) {
    console.error("[native/getClientsWithJobs]", error.message);
    return [];
  }

  return ((data ?? []) as ClientWithJobs[])
    .map((client) => ({
      ...client,
      job_postings: (client.job_postings ?? []).filter(
        (j: JobPosting) => j.status === "open"
      ),
    }))
    .filter((client) => client.job_postings.length > 0);
}

export async function getClientDetail(clientId: string): Promise<ClientWithJobs | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select(`*, job_postings(*), client_photos(*)`)
    .eq("id", clientId)
    .order("work_date", { referencedTable: "job_postings", ascending: true })
    .single();

  return (data as ClientWithJobs) ?? null;
}

export async function getAllClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as Client[];
}

// ========== 회원 쿼리 ==========

export async function getMyProfile(): Promise<Member | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("id", user.id)
    .limit(1);

  return ((data ?? [])[0] as Member) ?? null;
}

export async function getMyApplications(): Promise<Application[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("applications")
    .select(`*, job_postings(*, clients(company_name, location, hourly_wage))`)
    .order("applied_at", { ascending: false });

  return (data ?? []) as Application[];
}

export async function getMyWorkRecords(month?: string): Promise<WorkRecord[]> {
  const supabase = createClient();

  let query = supabase
    .from("work_records")
    .select("*, payments(*)")
    .order("work_date", { ascending: false });

  if (month) {
    const start = `${month}-01`;
    const endDate = new Date(
      Number(month.split("-")[0]),
      Number(month.split("-")[1]),
      0
    );
    const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;
    query = query.gte("work_date", start).lte("work_date", end);
  }

  const { data } = await query;
  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const rec = r as Record<string, unknown>;
    const payments = Array.isArray(rec.payments)
      ? rec.payments[0] ?? null
      : rec.payments ?? null;
    return { ...rec, payments } as WorkRecord;
  });
}

export async function getMyContracts(): Promise<WorkRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("work_records")
    .select("*")
    .not("contract_pdf_url", "is", null)
    .order("signed_at", { ascending: false });

  return (data ?? []) as WorkRecord[];
}

export async function getMyParentalConsent(): Promise<ParentalConsent | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parental_consents")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[native/getMyParentalConsent]", error.message);
    return null;
  }

  return (data as ParentalConsent) ?? null;
}

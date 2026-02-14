"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/supabase/queries";

export interface PaymentRecord {
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
  // joined from work_records
  work_record?: {
    client_name: string;
    work_date: string;
    start_time: string;
    end_time: string;
    wage_type: string | null;
    member_id: string;
    members?: {
      name: string;
      phone: string;
      bank_name: string | null;
      account_number: string | null;
    } | null;
  } | null;
}

export async function getPaymentsByMonth(month: string): Promise<PaymentRecord[]> {
  const admin = createAdminClient();

  const start = `${month}-01`;
  const endDate = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0);
  const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;

  const { data } = await admin
    .from("payments")
    .select("*, work_records!inner(client_name, work_date, start_time, end_time, wage_type, member_id, members(name, phone, bank_name, account_number))")
    .gte("work_records.work_date", start)
    .lte("work_records.work_date", end)
    .order("created_at", { ascending: false });

  // unwrap work_records join (1:1)
  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const rec = r as Record<string, unknown>;
    const wr = Array.isArray(rec.work_records) ? rec.work_records[0] ?? null : rec.work_records ?? null;
    return { ...rec, work_record: wr } as PaymentRecord;
  });
}

export async function getPaymentsForCsvExport(startDate: string, endDate: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payments")
    .select("*, work_records!inner(client_name, work_date, start_time, end_time, wage_type, member_id, members(name, phone, bank_name, account_number))")
    .gte("work_records.work_date", startDate)
    .lte("work_records.work_date", endDate)
    .order("work_records(work_date)", { ascending: true });

  if (error) return { data: [], error: error.message };

  const results = ((data ?? []) as unknown[]).map((r: unknown) => {
    const rec = r as Record<string, unknown>;
    const wr = Array.isArray(rec.work_records) ? rec.work_records[0] ?? null : rec.work_records ?? null;
    return { ...rec, work_record: wr } as PaymentRecord;
  });

  return { data: results, error: null };
}

export async function getMemberDetail(memberId: string): Promise<{ member: Member | null; profileImageUrl: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.from("members").select("*").eq("id", memberId).single();
  if (!data) return { member: null, profileImageUrl: null };

  const member = data as Member;
  let profileImageUrl: string | null = null;
  if (member.profile_image_url) {
    const { data: signed } = await admin.storage
      .from("profile-photos")
      .createSignedUrl(member.profile_image_url, 600);
    if (signed?.signedUrl) profileImageUrl = signed.signedUrl;
  }

  return { member, profileImageUrl };
}

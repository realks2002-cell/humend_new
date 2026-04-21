"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { Member, ParentalConsent } from "@/lib/supabase/queries";
import { escapeIlike, orValue } from "@/lib/supabase/filter-escape";

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
  income_tax: number;
  total_deduction: number;
  net_pay: number;
  status: string;
  admin_memo: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  start_time: string | null;
  end_time: string | null;
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
    .order("work_records(work_date)", { ascending: false });

  // unwrap work_records join (1:1)
  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const rec = r as Record<string, unknown>;
    const wr = Array.isArray(rec.work_records) ? rec.work_records[0] ?? null : rec.work_records ?? null;
    return { ...rec, work_record: wr } as PaymentRecord;
  });
}

export async function getAllPayments(
  page: number,
  pageSize: number,
  search?: string,
): Promise<{ data: PaymentRecord[]; total: number }> {
  const admin = createAdminClient();
  const from = (page - 1) * pageSize;

  const selectStr =
    "*, work_records!inner(client_name, work_date, start_time, end_time, wage_type, member_id, members(name, phone, bank_name, account_number))";

  const unwrap = (data: unknown[]): PaymentRecord[] =>
    data.map((r: unknown) => {
      const rec = r as Record<string, unknown>;
      const wr = Array.isArray(rec.work_records) ? rec.work_records[0] ?? null : rec.work_records ?? null;
      return { ...rec, work_record: wr } as PaymentRecord;
    });

  if (search && search.trim()) {
    // 서버 SQL 레벨 필터링 (max-rows 우회)
    const s = search.trim();
    const sPhone = s.replace(/-/g, "");
    const escS = escapeIlike(s);
    const escPhone = escapeIlike(sPhone);

    // 1) name/phone 매칭 member_id
    const { data: matchedMembers } = await admin
      .from("members")
      .select("id")
      .or(`name.ilike.${orValue(`%${escS}%`)},phone.ilike.${orValue(`%${escPhone}%`)}`)
      .limit(10000);
    const memberIds = (matchedMembers ?? []).map((m: { id: string }) => m.id);

    // 2) client_name 매칭 work_record_id
    const orConditions: string[] = [];
    if (memberIds.length > 0) {
      orConditions.push(`member_id.in.(${memberIds.join(",")})`);
    }
    orConditions.push(`client_name.ilike.${orValue(`%${escS}%`)}`);

    const { data: matchedWrs } = await admin
      .from("work_records")
      .select("id")
      .or(orConditions.join(","))
      .limit(10000);
    const workRecordIds = (matchedWrs ?? []).map((w: { id: string }) => w.id);

    if (workRecordIds.length === 0) {
      return { data: [], total: 0 };
    }

    const { data, count } = await admin
      .from("payments")
      .select(selectStr, { count: "exact" })
      .in("work_record_id", workRecordIds)
      .order("work_records(work_date)", { ascending: false })
      .range(from, from + pageSize - 1);

    return { data: unwrap((data ?? []) as unknown[]), total: count ?? 0 };
  }

  const { data, count } = await admin
    .from("payments")
    .select(selectStr, { count: "exact" })
    .order("work_records(work_date)", { ascending: false })
    .range(from, from + pageSize - 1);

  return { data: unwrap((data ?? []) as unknown[]), total: count ?? 0 };
}

export async function getPaymentsForCsvExport(startDate: string, endDate: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payments")
    .select("*, work_records!inner(client_name, work_date, start_time, end_time, wage_type, member_id, members(name, phone, bank_name, account_number))")
    .gte("work_records.work_date", startDate)
    .lte("work_records.work_date", endDate)
    .order("work_records(work_date)", { ascending: true })
    .limit(100000);

  if (error) {
    console.error("[getPaymentsForCsvExport] error:", error.message, { startDate, endDate });
    return { data: [], error: error.message };
  }

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
    if (member.profile_image_url.startsWith("http")) {
      profileImageUrl = member.profile_image_url;
    } else {
      const { data: signed } = await admin.storage
        .from("profile-photos")
        .createSignedUrl(member.profile_image_url, 600);
      if (signed?.signedUrl) profileImageUrl = signed.signedUrl;
    }
  }

  return { member, profileImageUrl };
}

export async function getConsentForMember(memberId: string): Promise<ParentalConsent | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parental_consents")
    .select("*")
    .eq("member_id", memberId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[getConsentForMember]", error.message);
    return null;
  }

  return (data as ParentalConsent) ?? null;
}

export async function deletePayment(paymentId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("payments").delete().eq("id", paymentId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SavePaymentData {
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
  admin_memo?: string;
}

export async function savePayment(workRecordId: string, data: SavePaymentData) {
  const supabase = await createClient();

  // 기존 payment 있는지 확인
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("work_record_id", workRecordId)
    .maybeSingle();

  if (existing) {
    // UPDATE
    const { error } = await supabase
      .from("payments")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    // INSERT
    const { error } = await supabase
      .from("payments")
      .insert({
        work_record_id: workRecordId,
        ...data,
        status: "확정",
      });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/payroll");
  return { success: true };
}

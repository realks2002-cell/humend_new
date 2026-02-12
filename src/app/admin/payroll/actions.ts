"use server";

import { bulkCreatePayments, bulkUpdatePaymentStatus } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function bulkConfirm(workRecordIds: string[]) {
  // work_records 값을 복사하여 payments 생성 (이미 있으면 skip)
  const result = await bulkCreatePayments(workRecordIds);
  revalidatePath("/admin/payroll");
  return result;
}

export async function bulkMarkPaid(workRecordIds: string[]) {
  const supabase = await createClient();

  // work_record_id로 payment ids 조회
  const { data: payments } = await supabase
    .from("payments")
    .select("id")
    .in("work_record_id", workRecordIds);

  const paymentIds = (payments ?? []).map((p) => p.id);

  if (paymentIds.length > 0) {
    await bulkUpdatePaymentStatus(paymentIds, "지급완료", new Date().toISOString());
  }

  // payment 없는 건은 먼저 생성 후 지급완료 처리
  const existingWorkRecordIds = new Set(
    ((await supabase.from("payments").select("work_record_id").in("work_record_id", workRecordIds)).data ?? [])
      .map((p) => p.work_record_id)
  );
  const missingIds = workRecordIds.filter((id) => !existingWorkRecordIds.has(id));

  if (missingIds.length > 0) {
    // 먼저 payments 생성
    await bulkCreatePayments(missingIds);
    // 생성된 payment들 지급완료 처리
    const { data: newPayments } = await supabase
      .from("payments")
      .select("id")
      .in("work_record_id", missingIds);
    const newIds = (newPayments ?? []).map((p) => p.id);
    if (newIds.length > 0) {
      await bulkUpdatePaymentStatus(newIds, "지급완료", new Date().toISOString());
    }
  }

  revalidatePath("/admin/payroll");
  return { error: null };
}

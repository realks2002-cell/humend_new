"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitPartnerInquiry(formData: FormData) {
  const companyName = formData.get("company_name") as string;
  const contactPerson = formData.get("contact_person") as string;
  const contactPhone = formData.get("contact_phone") as string;
  const contactEmail = formData.get("contact_email") as string;
  const message = formData.get("message") as string;

  if (!companyName?.trim() || !contactPerson?.trim() || !contactPhone?.trim()) {
    return { error: "회사명, 담당자명, 연락처는 필수 항목입니다." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("partner_inquiries").insert({
    company_name: companyName.trim(),
    contact_person: contactPerson.trim(),
    contact_phone: contactPhone.trim(),
    contact_email: contactEmail?.trim() || null,
    message: message?.trim() || null,
  });

  if (error) {
    return { error: "제출 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  return { success: true };
}

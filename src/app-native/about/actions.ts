/**
 * Overlay adapter — native-api wrapper matching original FormData-based signature
 */
import { submitPartnerInquiry as nativeSubmit } from "@/lib/native-api/actions";

export async function submitPartnerInquiry(formData: FormData) {
  const companyName = formData.get("company_name") as string;
  const contactPerson = formData.get("contact_person") as string;
  const contactPhone = formData.get("contact_phone") as string;
  const contactEmail = formData.get("contact_email") as string;
  const message = formData.get("message") as string;

  if (!companyName?.trim() || !contactPerson?.trim() || !contactPhone?.trim()) {
    return { error: "회사명, 담당자명, 연락처는 필수 항목입니다." };
  }

  return nativeSubmit({
    companyName: companyName.trim(),
    contactPerson: contactPerson.trim(),
    contactPhone: contactPhone.trim(),
    email: contactEmail?.trim() || undefined,
    content: message?.trim() || "",
  });
}

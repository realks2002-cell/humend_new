import { WEAK_PASSWORD_MESSAGE } from "@/lib/utils/password";

export const SIGNUP_FAILED_MESSAGE =
  "일시적인 문제로 가입하지 못했어요. 잠시 후 다시 시도해 주시고, 계속되면 카톡 상담으로 문의해 주세요.";

export function signupErrorMessage(code?: string): string {
  if (code === "weak_password") return WEAK_PASSWORD_MESSAGE;
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "가입 요청이 많아 잠시 제한됐어요. 1분 뒤 다시 시도해 주세요.";
  }
  return SIGNUP_FAILED_MESSAGE;
}

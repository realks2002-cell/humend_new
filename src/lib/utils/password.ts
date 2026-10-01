export function validatePassword(password: string): string | null {
  if (password.length < 6) return "비밀번호는 6자 이상이어야 합니다.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "비밀번호는 영문과 숫자를 모두 포함해야 합니다.";
  }
  return null;
}

export const WEAK_PASSWORD_MESSAGE =
  "너무 흔하거나 유출된 적 있는 비밀번호예요. 다른 비밀번호를 입력해 주세요.";

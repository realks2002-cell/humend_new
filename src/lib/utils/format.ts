// 날짜 포맷: "2/15(토)" — 타임존 무관하게 날짜 문자열 직접 파싱
export function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getUTCDay()];
  return `${m}/${d}(${weekday})`;
}

// 시간 포맷: "12:00:00" → "12:00"
export function formatTime(time: string) {
  return time.slice(0, 5);
}

// 시급 포맷: "15,000원"
export function formatWage(wage: number) {
  return wage.toLocaleString("ko-KR") + "원";
}

// 전화번호 포맷: "01012345678" → "010-1234-5678"
export function formatPhone(phone: string) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// 통화 포맷: 102000 → "102,000원"
export function formatCurrency(amount: number) {
  return amount.toLocaleString("ko-KR") + "원";
}

// 계좌번호 포맷: "123544444444" → "1235-4444-4444-44"
export function formatAccount(account: string) {
  const cleaned = account.replace(/[^0-9]/g, "");
  if (cleaned.length === 0) return account;
  return cleaned.replace(/(\d{4})(?=\d)/g, "$1-");
}

// 월 포맷: "2025-02" 또는 Date → "2025년 2월"
export function formatMonth(input: string | Date) {
  if (typeof input === "string") {
    const [year, month] = input.split("-").map(Number);
    return `${year}년 ${month}월`;
  }
  return `${input.getFullYear()}년 ${input.getMonth() + 1}월`;
}

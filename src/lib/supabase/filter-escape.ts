// PostgREST 필터 값 이스케이프 유틸

// ILIKE 와일드카드(%, _) + 백슬래시 이스케이프 → 사용자 입력을 리터럴로 처리
export function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

// PostgREST .or() / .filter() value 래핑 — , ( ) " 포함 값 안전 처리
export function orValue(raw: string): string {
  return `"${raw.replace(/[\\"]/g, "\\$&")}"`;
}

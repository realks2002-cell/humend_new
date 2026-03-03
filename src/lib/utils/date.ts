/**
 * 기간 내 근무일 배열 반환
 * @param startDate "2026-03-01"
 * @param endDate "2026-03-31"
 * @param workDays [1,2,3,4,5] (JS getDay() 기준: 0=일, 1=월, ..., 6=토)
 * @returns ["2026-03-02", "2026-03-03", ...] 근무일 배열
 */
export function getWorkDatesInRange(
  startDate: string,
  endDate: string,
  workDays: number[]
): string[] {
  const result: string[] = [];
  const workDaySet = new Set(workDays);

  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);

  const current = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  while (current <= end) {
    if (workDaySet.has(current.getUTCDay())) {
      const y = current.getUTCFullYear();
      const m = String(current.getUTCMonth() + 1).padStart(2, "0");
      const d = String(current.getUTCDate()).padStart(2, "0");
      result.push(`${y}-${m}-${d}`);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}

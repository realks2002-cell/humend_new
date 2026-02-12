// 급여 계산 유틸리티
// 4대보험 요율 (2024 기준, 근로자 부담분)
const RATES = {
  nationalPension: 0.045,       // 국민연금 4.5%
  healthInsurance: 0.03545,     // 건강보험 3.545%
  longTermCare: 0.1281,         // 장기요양 12.81% (건강보험 기준)
  employmentInsurance: 0.009,   // 고용보험 0.9%
};

// 연장근로 배율
const OVERTIME_MULTIPLIER = 1.5;
// 주휴수당: 주 15시간 이상 근무 시 하루치 급여
const WEEKLY_HOLIDAY_HOURS = 8;

export interface WorkHoursInput {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  breakMinutes?: number;
}

export interface SalaryInput {
  hourlyWage: number;
  workHours: number;
  overtimeHours?: number;
  includeWeeklyHoliday?: boolean;
}

export interface SalaryResult {
  workHours: number;
  overtimeHours: number;
  basePay: number;
  overtimePay: number;
  weeklyHolidayPay: number;
  grossPay: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  totalDeduction: number;
  netPay: number;
}

/**
 * 근무시간 계산 (휴게시간 차감)
 * 8시간 초과분은 연장근로로 분리
 */
export function calculateWorkHours(input: WorkHoursInput) {
  const [sh, sm] = input.startTime.split(":").map(Number);
  const [eh, em] = input.endTime.split(":").map(Number);

  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // 야간 근무

  const breakMin = input.breakMinutes ?? 0;
  const netMinutes = Math.max(0, totalMinutes - breakMin);
  const totalHours = netMinutes / 60;

  const workHours = Math.min(totalHours, 8);
  const overtimeHours = Math.max(0, totalHours - 8);

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    workHours: Math.round(workHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  };
}

/**
 * 급여 전체 계산 (기본급 + 연장수당 + 주휴수당 + 4대보험)
 */
export function calculateFullSalary(input: SalaryInput): SalaryResult {
  const { hourlyWage, workHours, overtimeHours = 0, includeWeeklyHoliday = false } = input;

  // 기본급
  const basePay = Math.round(hourlyWage * workHours);

  // 연장수당 (1.5배)
  const overtimePay = Math.round(hourlyWage * overtimeHours * OVERTIME_MULTIPLIER);

  // 주휴수당
  const weeklyHolidayPay = includeWeeklyHoliday
    ? Math.round(hourlyWage * WEEKLY_HOLIDAY_HOURS)
    : 0;

  // 총 급여
  const grossPay = basePay + overtimePay + weeklyHolidayPay;

  // 4대보험 공제 계산
  const nationalPension = Math.round(grossPay * RATES.nationalPension);
  const healthInsurance = Math.round(grossPay * RATES.healthInsurance);
  const longTermCare = Math.round(healthInsurance * RATES.longTermCare);
  const employmentInsurance = Math.round(grossPay * RATES.employmentInsurance);

  const totalDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance;
  const netPay = grossPay - totalDeduction;

  return {
    workHours,
    overtimeHours,
    basePay,
    overtimePay,
    weeklyHolidayPay,
    grossPay,
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    totalDeduction,
    netPay,
  };
}

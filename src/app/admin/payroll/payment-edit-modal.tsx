"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { type WorkRecord } from "@/lib/supabase/queries";
import { savePayment } from "./payment-actions";
import { calculateFullSalary } from "@/lib/utils/salary";

interface Props {
  record: WorkRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentEditModal({ record, open, onOpenChange }: Props) {
  const p = record.payments;

  const [hourlyWage, setHourlyWage] = useState(p?.hourly_wage ?? record.hourly_wage);
  const [workHours, setWorkHours] = useState(p?.work_hours ?? record.work_hours);
  const [overtimeHours, setOvertimeHours] = useState(p?.overtime_hours ?? record.overtime_hours);
  const [basePay, setBasePay] = useState(p?.base_pay ?? record.base_pay);
  const [overtimePay, setOvertimePay] = useState(p?.overtime_pay ?? record.overtime_pay);
  const [weeklyHolidayPay, setWeeklyHolidayPay] = useState(p?.weekly_holiday_pay ?? record.weekly_holiday_pay);
  const [grossPay, setGrossPay] = useState(p?.gross_pay ?? record.gross_pay);
  const [nationalPension, setNationalPension] = useState(p?.national_pension ?? record.national_pension);
  const [healthInsurance, setHealthInsurance] = useState(p?.health_insurance ?? record.health_insurance);
  const [longTermCare, setLongTermCare] = useState(p?.long_term_care ?? record.long_term_care);
  const [employmentInsurance, setEmploymentInsurance] = useState(p?.employment_insurance ?? record.employment_insurance);
  const [totalDeduction, setTotalDeduction] = useState(p?.total_deduction ?? record.total_deduction);
  const [netPay, setNetPay] = useState(p?.net_pay ?? record.net_pay);
  const [adminMemo, setAdminMemo] = useState(p?.admin_memo ?? "");
  const [loading, setLoading] = useState(false);

  function handleRecalculate() {
    const result = calculateFullSalary({
      hourlyWage,
      workHours,
      overtimeHours,
      includeWeeklyHoliday: workHours >= 15,
    });
    setBasePay(result.basePay);
    setOvertimePay(result.overtimePay);
    setWeeklyHolidayPay(result.weeklyHolidayPay);
    setGrossPay(result.grossPay);
    setNationalPension(result.nationalPension);
    setHealthInsurance(result.healthInsurance);
    setLongTermCare(result.longTermCare);
    setEmploymentInsurance(result.employmentInsurance);
    setTotalDeduction(result.totalDeduction);
    setNetPay(result.netPay);
  }

  async function handleSave() {
    setLoading(true);
    const result = await savePayment(record.id, {
      hourly_wage: hourlyWage,
      work_hours: workHours,
      overtime_hours: overtimeHours,
      base_pay: basePay,
      overtime_pay: overtimePay,
      weekly_holiday_pay: weeklyHolidayPay,
      gross_pay: grossPay,
      national_pension: nationalPension,
      health_insurance: healthInsurance,
      long_term_care: longTermCare,
      employment_insurance: employmentInsurance,
      total_deduction: totalDeduction,
      net_pay: netPay,
      admin_memo: adminMemo || undefined,
    });
    setLoading(false);

    if (result.error) {
      toast.error("저장 실패: " + result.error);
    } else {
      toast.success("급여가 저장되었습니다");
      onOpenChange(false);
    }
  }

  function diff(original: number, current: number) {
    if (original === current) return null;
    const d = current - original;
    return (
      <span className={d > 0 ? "text-blue-600" : "text-red-600"}>
        ({d > 0 ? "+" : ""}{d.toLocaleString()})
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>급여 편집</DialogTitle>
        </DialogHeader>

        {/* 근무 정보 요약 */}
        <div className="rounded-md bg-muted p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{record.members?.name ?? "-"}</span>
            <span className="text-muted-foreground">{record.client_name}</span>
            {p && <Badge variant="default">확정됨</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">
            {formatDate(record.work_date)} {record.start_time.slice(0, 5)}~{record.end_time.slice(0, 5)}
          </p>
        </div>

        {/* 시급 / 시간 + 재계산 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>시급</Label>
            <Input
              type="number"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(Number(e.target.value))}
            />
            {diff(record.hourly_wage, hourlyWage)}
          </div>
          <div>
            <Label>근무시간</Label>
            <Input
              type="number"
              step="0.5"
              value={workHours}
              onChange={(e) => setWorkHours(Number(e.target.value))}
            />
            {diff(record.work_hours, workHours)}
          </div>
          <div>
            <Label>연장시간</Label>
            <Input
              type="number"
              step="0.5"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(Number(e.target.value))}
            />
            {diff(record.overtime_hours, overtimeHours)}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRecalculate}>
          재계산
        </Button>

        {/* 지급 항목 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">지급 항목</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>기본급</Label>
              <Input type="number" value={basePay} onChange={(e) => setBasePay(Number(e.target.value))} />
              {diff(record.base_pay, basePay)}
            </div>
            <div>
              <Label>연장수당</Label>
              <Input type="number" value={overtimePay} onChange={(e) => setOvertimePay(Number(e.target.value))} />
              {diff(record.overtime_pay, overtimePay)}
            </div>
            <div>
              <Label>주휴수당</Label>
              <Input type="number" value={weeklyHolidayPay} onChange={(e) => setWeeklyHolidayPay(Number(e.target.value))} />
              {diff(record.weekly_holiday_pay, weeklyHolidayPay)}
            </div>
            <div>
              <Label>총지급액</Label>
              <Input type="number" value={grossPay} onChange={(e) => setGrossPay(Number(e.target.value))} />
              {diff(record.gross_pay, grossPay)}
            </div>
          </div>
        </div>

        {/* 공제 항목 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">4대보험 공제</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>국민연금</Label>
              <Input type="number" value={nationalPension} onChange={(e) => setNationalPension(Number(e.target.value))} />
            </div>
            <div>
              <Label>건강보험</Label>
              <Input type="number" value={healthInsurance} onChange={(e) => setHealthInsurance(Number(e.target.value))} />
            </div>
            <div>
              <Label>장기요양</Label>
              <Input type="number" value={longTermCare} onChange={(e) => setLongTermCare(Number(e.target.value))} />
            </div>
            <div>
              <Label>고용보험</Label>
              <Input type="number" value={employmentInsurance} onChange={(e) => setEmploymentInsurance(Number(e.target.value))} />
            </div>
            <div>
              <Label>공제합계</Label>
              <Input type="number" value={totalDeduction} onChange={(e) => setTotalDeduction(Number(e.target.value))} />
              {diff(record.total_deduction, totalDeduction)}
            </div>
            <div>
              <Label className="font-bold">실수령액</Label>
              <Input type="number" value={netPay} onChange={(e) => setNetPay(Number(e.target.value))} className="font-bold" />
              {diff(record.net_pay, netPay)}
            </div>
          </div>
        </div>

        {/* 원본 참고 */}
        {p && (
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">원본 (work_record)</p>
            <div className="mt-1 grid grid-cols-3 gap-1">
              <span>기본급: {formatCurrency(record.base_pay)}</span>
              <span>연장수당: {formatCurrency(record.overtime_pay)}</span>
              <span>주휴수당: {formatCurrency(record.weekly_holiday_pay)}</span>
              <span>총지급액: {formatCurrency(record.gross_pay)}</span>
              <span>공제합계: {formatCurrency(record.total_deduction)}</span>
              <span>실수령액: {formatCurrency(record.net_pay)}</span>
            </div>
          </div>
        )}

        {/* 메모 */}
        <div>
          <Label>관리자 메모</Label>
          <Textarea
            value={adminMemo}
            onChange={(e) => setAdminMemo(e.target.value)}
            placeholder="수정 사유 등 메모"
            rows={2}
          />
        </div>

        {/* 저장 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "저장 중..." : "저장"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

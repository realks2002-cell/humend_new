"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Receipt } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { type WorkRecord } from "@/lib/supabase/queries";

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? "font-semibold text-sm" : "text-sm"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function PayslipModal({ record }: { record: WorkRecord }) {
  const [open, setOpen] = useState(false);
  const p = record.payments;
  if (!p) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 px-2 text-xs rounded-none bg-red-400 text-white hover:bg-red-500">
          <Receipt className="mr-1 h-3 w-3" />
          급여명세서
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>급여지급 명세서</DialogTitle>
        </DialogHeader>

        {/* 근무 정보 */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="font-medium">{record.client_name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(record.work_date)} {record.start_time.slice(0, 5)}~{record.end_time.slice(0, 5)}
          </p>
          <div className="mt-1">
            <Badge variant={p.status === "지급완료" ? "default" : "secondary"} className={`text-[10px] ${p.status === "지급완료" ? "bg-green-600 hover:bg-green-600" : ""}`}>
              {p.status}
            </Badge>
          </div>
        </div>

        {/* 지급 내역 */}
        <div className="space-y-0 border-b pb-2">
          <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">지급 내역</h4>
          <Row label="시급" value={formatCurrency(p.hourly_wage)} />
          <Row label="근무시간" value={`${p.work_hours}시간`} />
          {p.overtime_hours > 0 && (
            <Row label="연장근무" value={`${p.overtime_hours}시간`} />
          )}
          <Row label="기본급" value={formatCurrency(p.base_pay)} />
          {p.overtime_pay > 0 && (
            <Row label="연장수당 (1.5배)" value={formatCurrency(p.overtime_pay)} />
          )}
          {p.weekly_holiday_pay > 0 && (
            <Row label="주휴수당" value={formatCurrency(p.weekly_holiday_pay)} />
          )}
          <div className="border-t pt-1">
            <Row label="총 지급액" value={formatCurrency(p.gross_pay)} bold />
          </div>
        </div>

        {/* 공제 내역 */}
        <div className="space-y-0 border-b pb-2">
          <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">공제 내역</h4>
          {p.national_pension > 0 && (
            <Row label="국민연금 (4.5%)" value={`-${formatCurrency(p.national_pension)}`} />
          )}
          {p.health_insurance > 0 && (
            <Row label="건강보험 (3.545%)" value={`-${formatCurrency(p.health_insurance)}`} />
          )}
          {p.long_term_care > 0 && (
            <Row label="장기요양 (12.81%)" value={`-${formatCurrency(p.long_term_care)}`} />
          )}
          {p.employment_insurance > 0 && (
            <Row label="고용보험 (0.9%)" value={`-${formatCurrency(p.employment_insurance)}`} />
          )}
          <div className="border-t pt-1">
            <Row label="공제 합계" value={`-${formatCurrency(p.total_deduction)}`} bold />
          </div>
        </div>

        {/* 실수령액 */}
        <div className="rounded-lg bg-primary/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">실수령액</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(p.net_pay)}</p>
        </div>

        {p.paid_at && (
          <p className="text-center text-xs text-muted-foreground">
            지급일: {formatDate(p.paid_at)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

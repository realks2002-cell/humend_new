"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Pen } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { type WorkRecord } from "@/lib/supabase/queries";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { submitSignature } from "./actions";

const statusStyle: Record<string, "secondary" | "default" | "destructive"> = {
  "대기": "secondary",
  "확정": "default",
  "지급완료": "default",
};

export function SalaryDetail({ record }: { record: WorkRecord }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [signing, setSigning] = useState(false);
  const [loading, setLoading] = useState(false);

  const p = record.payments;
  // 표시 데이터: payment 있으면 최종본, 없으면 원본
  const display = p ?? record;
  const displayStatus = p?.status ?? record.status;
  const hasDiff = p ? p.net_pay !== record.net_pay : false;

  const needsSignature = !record.signature_url && record.status !== "지급완료";

  async function handleSign(dataUrl: string) {
    setLoading(true);
    await submitSignature(record.id, dataUrl);
    toast.success("전자서명이 완료되었습니다");
    setSigning(false);
    setLoading(false);
    router.refresh();
  }

  function DiffText({ original, current }: { original: number; current: number }) {
    if (original === current) return null;
    const d = current - original;
    return (
      <span className={`ml-1 text-[10px] ${d > 0 ? "text-blue-600" : "text-red-600"}`}>
        ({d > 0 ? "+" : ""}{d.toLocaleString()})
      </span>
    );
  }

  return (
    <Card>
      <CardContent className="py-3">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div>
            <p className="text-sm font-medium">{record.client_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(record.work_date)} {record.start_time.slice(0, 5)}~{record.end_time.slice(0, 5)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold">
                {formatCurrency(display.net_pay)}
                {hasDiff && <span className="ml-1 text-[10px] text-blue-600">수정</span>}
              </p>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <Badge variant={statusStyle[displayStatus] ?? "secondary"} className={statusStyle[displayStatus] === "default" ? "bg-green-600 hover:bg-green-600" : ""}>
                  {displayStatus}
                </Badge>
                {p && <Badge variant="outline" className="text-[10px] px-1">확정</Badge>}
              </div>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 space-y-1 border-t pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">시급</span>
              <span>
                {formatCurrency(display.hourly_wage)}
                {p && <DiffText original={record.hourly_wage} current={p.hourly_wage} />}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">근무시간</span>
              <span>
                {display.work_hours}h
                {p && p.work_hours !== record.work_hours && (
                  <span className="ml-1 text-[10px] text-muted-foreground">(원본: {record.work_hours}h)</span>
                )}
              </span>
            </div>
            {display.overtime_hours > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">연장근무</span>
                <span>{display.overtime_hours}h</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">기본급</span>
              <span>
                {formatCurrency(display.base_pay)}
                {p && <DiffText original={record.base_pay} current={p.base_pay} />}
              </span>
            </div>
            {display.overtime_pay > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">연장수당</span>
                <span>
                  {formatCurrency(display.overtime_pay)}
                  {p && <DiffText original={record.overtime_pay} current={p.overtime_pay} />}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">총 지급액</span>
              <span>
                {formatCurrency(display.gross_pay)}
                {p && <DiffText original={record.gross_pay} current={p.gross_pay} />}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">공제합계</span>
              <span className="text-destructive">
                -{formatCurrency(display.total_deduction)}
                {p && <DiffText original={record.total_deduction} current={p.total_deduction} />}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 font-medium text-sm">
              <span>실수령액</span>
              <span>
                {formatCurrency(display.net_pay)}
                {p && <DiffText original={record.net_pay} current={p.net_pay} />}
              </span>
            </div>

            {needsSignature && (
              <Dialog open={signing} onOpenChange={setSigning}>
                <DialogTrigger asChild>
                  <Button size="sm" className="mt-3 w-full bg-orange-500 text-white hover:bg-orange-600">
                    <Pen className="mr-2 h-3 w-3" />
                    전자서명
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>전자서명</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    아래에 서명해주세요. 서명 후 급여 확인이 완료됩니다.
                  </p>
                  <SignaturePad
                    onSave={handleSign}
                    loading={loading}
                  />
                </DialogContent>
              </Dialog>
            )}

            {record.signature_url && (
              <p className="mt-2 text-center text-xs text-green-600">서명 완료</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

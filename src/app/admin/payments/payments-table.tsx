"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { type PaymentRecord, getPaymentsForCsvExport } from "./actions";
import { type Member } from "@/lib/supabase/queries";
import { MemberDetailModal } from "../members/member-detail-modal";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDisplay(d: Date) {
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

interface PaymentsTableProps {
  payments: PaymentRecord[];
  membersMap: Record<string, Member>;
  profileImageUrls: Record<string, string>;
}

export function PaymentsTable({ payments, membersMap, profileImageUrls }: PaymentsTableProps) {
  const [search, setSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // CSV date range
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const d = p.work_record?.work_date ?? "";
      if (filterStartDate && d < filterStartDate) return false;
      if (filterEndDate && d > filterEndDate) return false;
      if (!search) return true;
      const s = search.replace(/-/g, "");
      const name = p.work_record?.members?.name ?? "";
      const phone = (p.work_record?.members?.phone ?? "").replace(/-/g, "");
      const client = p.work_record?.client_name ?? "";
      return (
        name.includes(search) ||
        phone.includes(s) ||
        client.includes(search)
      );
    });
  }, [payments, search, filterStartDate, filterEndDate]);

  async function handleCsvExport() {
    if (!startDate || !endDate) {
      toast.error("시작일과 종료일을 선택해주세요");
      return;
    }
    if (startDate > endDate) {
      toast.error("시작일이 종료일보다 늦을 수 없습니다");
      return;
    }

    setCsvLoading(true);
    try {
      const result = await getPaymentsForCsvExport(toDateStr(startDate), toDateStr(endDate));
      if (result.error) {
        toast.error("데이터 조회 실패", { description: result.error });
        return;
      }
      if (result.data.length === 0) {
        toast.warning("해당 기간에 지급 내역이 없습니다");
        return;
      }

      const header = "이름,전화번호,근무지,근무일,급여타입,출근시간,퇴근시간,근무시간,연장시간,시급,기본급,연장수당,주휴수당,총지급액,국민연금,건강보험,장기요양,고용보험,공제합계,실수령액,은행명,계좌번호,상태,관리자메모,지급일,생성일,수정일";
      const rows = result.data.map((p) => {
        const wr = p.work_record;
        const paidAt = p.paid_at ? p.paid_at.split("T")[0] : "";
        const createdAt = p.created_at ? p.created_at.split("T")[0] : "";
        const updatedAt = p.updated_at ? p.updated_at.split("T")[0] : "";
        return [
          wr?.members?.name ?? "",
          wr?.members?.phone ?? "",
          wr?.client_name ?? "",
          wr?.work_date ?? "",
          wr?.wage_type ?? "",
          wr?.start_time ?? "",
          wr?.end_time ?? "",
          p.work_hours,
          p.overtime_hours,
          p.hourly_wage,
          p.base_pay,
          p.overtime_pay,
          p.weekly_holiday_pay,
          p.gross_pay,
          p.national_pension,
          p.health_insurance,
          p.long_term_care,
          p.employment_insurance,
          p.total_deduction,
          p.net_pay,
          wr?.members?.bank_name ?? "",
          wr?.members?.account_number ?? "",
          p.status,
          p.admin_memo ?? "",
          paidAt,
          createdAt,
          updatedAt,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",");
      });

      const bom = "\uFEFF";
      const csv = bom + header + "\n" + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `급여지급내역_${toDateStr(startDate)}_${toDateStr(endDate)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${result.data.length}건 CSV 내보내기 완료`);
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 px-4">
        <Input
          placeholder="이름, 전화번호 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[180px] h-9 text-sm"
        />
        <Input
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          className="w-[145px] h-9 text-sm"
        />
        <span className="text-xs text-muted-foreground">~</span>
        <Input
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          className="w-[145px] h-9 text-sm"
        />
        {(search || filterStartDate || filterEndDate) && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setSearch(""); setFilterStartDate(""); setFilterEndDate(""); }}
          >
            초기화
          </button>
        )}
        <span className="text-xs text-muted-foreground">{filtered.length}건</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* CSV Export */}
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-[13px] font-normal">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {startDate ? toDisplay(startDate) : "시작일"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => { setStartDate(d); setStartOpen(false); }}
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">~</span>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-[13px] font-normal">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {endDate ? toDisplay(endDate) : "종료일"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => { setEndDate(d); setEndOpen(false); }}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCsvExport}
            disabled={csvLoading || !startDate || !endDate}
          >
            <Download className="mr-1 h-3 w-3" />
            {csvLoading ? "내보내는 중..." : "CSV 내보내기"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[100px]" />
            <col className="w-[100px] hidden sm:table-column" />
            <col className="w-[80px] hidden md:table-column" />
            <col className="w-[100px] hidden sm:table-column" />
            <col className="w-[100px]" />
            <col className="w-[80px] hidden sm:table-column" />
          </colgroup>
          <thead>
            <tr className="border-b text-center text-muted-foreground">
              <th className="pb-2 px-2">이름</th>
              <th className="pb-2 px-2">근무지</th>
              <th className="pb-2 px-2 hidden sm:table-cell">근무일</th>
              <th className="pb-2 px-2 hidden md:table-cell">근무시간</th>
              <th className="pb-2 px-2 hidden sm:table-cell">총지급액</th>
              <th className="pb-2 px-2">실수령액</th>
              <th className="pb-2 px-2 hidden sm:table-cell">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  급여지급 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const wr = p.work_record;
                const memberId = wr?.member_id;
                const member = memberId ? membersMap[memberId] : null;
                const rawPhone = (wr?.members?.phone ?? "").replace(/\D/g, "");
                const phone = rawPhone.length === 11
                  ? `${rawPhone.slice(0, 3)}-${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`
                  : rawPhone;
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 text-center">
                      {member ? (
                        <button
                          type="button"
                          className="font-medium text-blue-600 hover:underline"
                          onClick={() => setSelectedMember(member)}
                        >
                          {wr?.members?.name ?? "-"}
                        </button>
                      ) : (
                        <div className="font-medium">{wr?.members?.name ?? "-"}</div>
                      )}
                      {phone && (
                        <div className="text-xs text-muted-foreground">{phone}</div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">{wr?.client_name ?? "-"}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      {wr?.work_date ? formatDate(wr.work_date) : "-"}
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell text-center">{p.work_hours + p.overtime_hours}h</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">{formatCurrency(p.gross_pay)}</td>
                    <td className="py-2 px-2 text-center font-medium">{formatCurrency(p.net_pay)}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      <Badge
                        variant={p.status === "지급완료" ? "default" : "secondary"}
                        className={p.status === "지급완료" ? "bg-emerald-600 hover:bg-emerald-600" : ""}
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <MemberDetailModal
        member={selectedMember}
        profileImageUrl={selectedMember ? profileImageUrls[selectedMember.id] ?? null : null}
        workRecords={[]}
        open={!!selectedMember}
        onOpenChange={(open) => { if (!open) setSelectedMember(null); }}
      />
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Download, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type PaymentRecord, getPaymentsForCsvExport, getMemberDetail, getConsentForMember, deletePayment } from "./actions";
import { type Member, type Payment, type ParentalConsent } from "@/lib/supabase/queries";
import { MemberDetailModal } from "../members/member-detail-modal";
import { PayslipContent, type PayslipRecord } from "@/app/my/salary/payslip-modal";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDisplay(d: Date) {
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

interface PaymentsTableProps {
  payments: PaymentRecord[];
  membersMap: Record<string, Member>;
  consentsMap: Record<string, ParentalConsent>;
  profileImageUrls: Record<string, string>;
  currentMonth: string;
  page: number;
  pageSize: number;
  total: number;
}

export function PaymentsTable({ payments, membersMap, consentsMap, profileImageUrls, currentMonth, page, pageSize, total }: PaymentsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedProfileUrl, setSelectedProfileUrl] = useState<string | null>(null);
  const [isLoadingProfile, startProfileTransition] = useTransition();
  const [payslipData, setPayslipData] = useState<PayslipRecord | null>(null);
  const [consentData, setConsentData] = useState<{ consent: ParentalConsent; member: Member } | null>(null);
  const [isLoadingConsent, startConsentTransition] = useTransition();

  function handleConsentClick(memberId: string) {
    const consent = consentsMap[memberId];
    const member = membersMap[memberId];
    if (consent && member) {
      setConsentData({ consent, member });
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  function goToPage(p: number) {
    const params = new URLSearchParams();
    params.set("month", currentMonth);
    params.set("page", String(p));
    router.push(`/admin/payments?${params.toString()}`);
  }

  function handleMemberClick(member: Member) {
    setSelectedMember(member);
    setSelectedProfileUrl(null);
    startProfileTransition(async () => {
      const { profileImageUrl } = await getMemberDetail(member.id);
      setSelectedProfileUrl(profileImageUrl);
    });
  }

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

      const header = "이름,전화번호,근무지,근무일,급여타입,출근시간,퇴근시간,근무시간,연장시간,시급,기본급,연장수당,주휴수당,총지급액,국민연금,건강보험,장기요양,고용보험,소득세,공제합계,실수령액,은행명,계좌번호,상태,관리자메모,지급일,생성일,수정일";
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
          p.start_time ?? wr?.start_time ?? "",
          p.end_time ?? wr?.end_time ?? "",
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
          p.income_tax,
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
            <col className="w-[80px] hidden md:table-column" />
            <col className="w-[70px] hidden md:table-column" />
            <col className="w-[80px] hidden md:table-column" />
            <col className="w-[100px] hidden lg:table-column" />
            <col className="w-[100px] hidden sm:table-column" />
            <col className="w-[100px]" />
            <col className="w-[80px] hidden sm:table-column" />
            <col className="w-[50px]" />
          </colgroup>
          <thead>
            <tr className="border-b text-center text-muted-foreground">
              <th className="pb-2 px-2">이름</th>
              <th className="pb-2 px-2">근무지</th>
              <th className="pb-2 px-2 hidden sm:table-cell">근무일</th>
              <th className="pb-2 px-2 hidden md:table-cell">시작시간</th>
              <th className="pb-2 px-2 hidden md:table-cell">종료시간</th>
              <th className="pb-2 px-2 hidden md:table-cell">시급/일급</th>
              <th className="pb-2 px-2 hidden md:table-cell">근무시간</th>
              <th className="pb-2 px-2 hidden lg:table-cell">공제내역</th>
              <th className="pb-2 px-2 hidden sm:table-cell">총지급액</th>
              <th className="pb-2 px-2">실수령액</th>
              <th className="pb-2 px-2 hidden sm:table-cell">상태</th>
              <th className="pb-2 px-2">삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-muted-foreground">
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
                const totalHours = p.work_hours + p.overtime_hours;
                const deductions = [
                  p.national_pension > 0 ? `국민연금 ${formatCurrency(p.national_pension)}` : null,
                  p.health_insurance > 0 ? `건강보험 ${formatCurrency(p.health_insurance)}` : null,
                  p.long_term_care > 0 ? `장기요양 ${formatCurrency(p.long_term_care)}` : null,
                  p.employment_insurance > 0 ? `고용보험 ${formatCurrency(p.employment_insurance)}` : null,
                  p.income_tax > 0 ? `소득세 ${formatCurrency(p.income_tax)}` : null,
                ].filter(Boolean);
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {member ? (
                          <button
                            type="button"
                            className="font-medium text-blue-600 hover:underline"
                            onClick={() => handleMemberClick(member)}
                          >
                            {wr?.members?.name ?? "-"}
                          </button>
                        ) : (
                          <span className="font-medium">{wr?.members?.name ?? "-"}</span>
                        )}
                        {memberId && consentsMap[memberId] && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-amber-300 text-amber-600 cursor-pointer hover:bg-amber-50"
                            onClick={() => handleConsentClick(memberId)}
                          >
                            동의서
                          </Badge>
                        )}
                      </div>
                      {phone && (
                        <div className="text-xs text-muted-foreground">{phone}</div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">{wr?.client_name ?? "-"}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      {wr?.work_date ? formatDate(wr.work_date) : "-"}
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell text-center">{(p.start_time ?? wr?.start_time) ? (p.start_time ?? wr?.start_time)!.slice(0, 5) : "-"}</td>
                    <td className="py-2 px-2 hidden md:table-cell text-center">{(p.end_time ?? wr?.end_time) ? (p.end_time ?? wr?.end_time)!.slice(0, 5) : "-"}</td>
                    <td className="py-2 px-2 hidden md:table-cell text-center">
                      {wr?.wage_type ?? "-"}
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell text-center">{totalHours}h</td>
                    <td className="py-2 px-2 hidden lg:table-cell text-center">
                      {p.total_deduction > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className="hover:underline">
                              {formatCurrency(p.total_deduction)}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3 text-xs space-y-1" align="center">
                            {deductions.map((d) => (
                              <div key={d}>{d}</div>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">{formatCurrency(p.gross_pay)}</td>
                    <td className="py-2 px-2 text-center font-medium">{formatCurrency(p.net_pay)}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-center">
                      <Badge
                        variant={p.status === "지급완료" ? "default" : "secondary"}
                        className={`cursor-pointer ${p.status === "지급완료" ? "bg-emerald-600 hover:bg-emerald-500/80" : "hover:bg-secondary/80"}`}
                        onClick={() => {
                          setPayslipData({
                            client_name: wr?.client_name ?? "-",
                            work_date: wr?.work_date ?? "",
                            start_time: p.start_time ?? wr?.start_time ?? "00:00",
                            end_time: p.end_time ?? wr?.end_time ?? "00:00",
                            hourly_wage: p.hourly_wage,
                            net_pay: p.net_pay,
                            payments: p as unknown as Payment,
                          });
                        }}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                        onClick={async () => {
                          if (!window.confirm("이 정산 내역을 삭제하시겠습니까?")) return;
                          const result = await deletePayment(p.id);
                          if (result.success) {
                            toast.success("삭제되었습니다");
                            router.refresh();
                          } else {
                            toast.error("삭제 실패", { description: result.error ?? undefined });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 border-t px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-1 text-xs text-muted-foreground">...</span>
              ) : (
                <Button
                  key={item}
                  variant={item === page ? "default" : "ghost"}
                  size="sm"
                  onClick={() => goToPage(item)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {item}
                </Button>
              )
            )}
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <MemberDetailModal
        member={selectedMember}
        profileImageUrl={selectedProfileUrl}
        workRecords={[]}
        open={!!selectedMember}
        onOpenChange={(open) => { if (!open) setSelectedMember(null); }}
      />

      <Dialog open={!!payslipData} onOpenChange={(open) => { if (!open) setPayslipData(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>급여지급 명세서</DialogTitle>
          </DialogHeader>
          {payslipData && <PayslipContent record={payslipData} />}
        </DialogContent>
      </Dialog>

      {/* 친권자 동의서 보기 */}
      <Dialog open={!!consentData} onOpenChange={(open) => { if (!open) setConsentData(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>친권자 (후견인) 동의서</DialogTitle>
          </DialogHeader>
          {consentData && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">■ 친권자 인적사항</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">성명</span><span>{consentData.consent.guardian_name}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">연락처</span><span>{consentData.consent.guardian_phone}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">관계</span><span>{consentData.consent.guardian_relationship}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">■ 연소근로자 인적사항</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">성명</span><span>{consentData.member.name ?? "-"}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">생년월일</span><span>{consentData.member.birth_date ?? "-"}</span></div>
                  <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">연락처</span><span>{consentData.member.phone}</span></div>
                </div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-center text-sm">
                본인은 위 연소근로자 <strong>{consentData.member.name ?? "___"}</strong>가
                (주)휴멘드에서 제공하는 사업장에서 근로를 하는 것에 대하여 동의합니다.
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {new Date(consentData.consent.consented_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">친권자 서명</p>
                <div className="rounded-lg border bg-white p-2">
                  <img src={consentData.consent.signature_url} alt="서명" className="h-20 mx-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

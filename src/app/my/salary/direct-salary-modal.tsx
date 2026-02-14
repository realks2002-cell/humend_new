"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, XIcon } from "lucide-react";
import { ko } from "date-fns/locale";
import { type Client } from "@/lib/supabase/queries";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { submitDirectSalary } from "./actions";
import { toast } from "sonner";

interface WorkerInfo {
  name: string;
  rrnFront: string;
  rrnBack: string;
  phone: string;
  region: string;
}

// 30분 단위 시간 옵션 생성
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-[130px] rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#1e2a5a] px-3 py-2 text-sm font-semibold text-white">
      {children}
    </div>
  );
}

function TableRow({ label, value, label2, value2 }: { label: string; value: string; label2?: string; value2?: string }) {
  if (label2 !== undefined) {
    return (
      <div className="flex border-b text-sm">
        <div className="w-28 shrink-0 bg-gray-100 px-3 py-2 font-medium text-gray-600 border-r">{label}</div>
        <div className="flex-1 px-3 py-2">{value}</div>
        <div className="w-28 shrink-0 bg-gray-100 px-3 py-2 font-medium text-gray-600 border-l border-r">{label2}</div>
        <div className="flex-1 px-3 py-2">{value2}</div>
      </div>
    );
  }
  return (
    <div className="flex border-b text-sm">
      <div className="w-28 shrink-0 bg-gray-100 px-3 py-2 font-medium text-gray-600 border-r">{label}</div>
      <div className="flex-1 px-3 py-2">{value}</div>
    </div>
  );
}

export function DirectSalaryModal({ clients, worker }: { clients: Client[]; worker: WorkerInfo }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "contract" | "sign">("form");
  const [loading, setLoading] = useState(false);

  // 근무 정보 입력 상태
  const [selectedClientId, setSelectedClientId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [wageType, setWageType] = useState<"시급" | "일급">("시급");
  const [wageAmount, setWageAmount] = useState("");
  const [agreed, setAgreed] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientName = selectedClient?.company_name ?? "";
  const displayWage = wageAmount ? Number(wageAmount) : 0;
  const rrn = worker.rrnFront && worker.rrnBack ? `${worker.rrnFront}-${worker.rrnBack}` : "";

  function formatPhone(phone: string) {
    const nums = phone.replace(/\D/g, "");
    if (nums.length === 11) return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
    return phone;
  }

  const isFormValid = selectedClientId && workDate && wageAmount && Number(wageAmount) > 0;

  async function handleSign(dataUrl: string) {
    setLoading(true);
    const result = await submitDirectSalary({
      clientName,
      workDate,
      startTime,
      endTime,
      wageType,
      wageAmount: Number(wageAmount),
      signatureDataUrl: dataUrl,
    });
    setLoading(false);
    if (result.error) {
      toast.error("급여 신청 실패", { description: result.error });
      return;
    }
    toast.success("별도 근무 급여신청이 완료되었습니다");
    setOpen(false);
    resetForm();
    router.refresh();
  }

  function resetForm() {
    setStep("form");
    setSelectedClientId("");
    setWorkDate("");
    setStartTime("09:00");
    setEndTime("18:00");
    setWageType("시급");
    setWageAmount("");
    setAgreed(false);
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full bg-[#1e2a5a] hover:bg-[#2a3a7a]">
          <PlusCircle className="mr-2 h-4 w-4" />
          별도 근무 급여신청
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className={`${step === "form" ? "max-w-md" : "!max-w-4xl"} max-h-[90vh] overflow-y-auto p-0 gap-0`}>
        <VisuallyHidden><DialogTitle>별도 근무 급여신청</DialogTitle></VisuallyHidden>
        {step !== "form" && (
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 text-white hover:opacity-80"
          >
            <XIcon className="h-5 w-5" />
          </button>
        )}

        {step === "form" ? (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold">별도 근무 급여신청</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                사이트에서 근무신청 없이 별도로 근무한 경우<br />
                근무 정보를 직접 입력해 주세요.
              </p>
            </div>

            {/* 근무지 선택 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">근무지</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">근무지를 선택해 주세요</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            {/* 근무일 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">근무일</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="flex h-10 w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    {workDate || "날짜를 선택해 주세요"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={ko}
                    selected={workDate ? new Date(workDate + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");
                        setWorkDate(`${y}-${m}-${d}`);
                      }
                      setCalendarOpen(false);
                    }}
                    modifiers={{
                      weekend: (date) => date.getDay() === 0 || date.getDay() === 6,
                    }}
                    modifiersClassNames={{
                      weekend: "text-red-500",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 근무시간 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">근무시간</label>
              <div className="flex items-center gap-2">
                <TimeSelect value={startTime} onChange={setStartTime} />
                <span className="text-gray-500 font-medium">~</span>
                <TimeSelect value={endTime} onChange={setEndTime} />
              </div>
            </div>

            {/* 급여구분 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">급여구분</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="directWageType"
                    checked={wageType === "시급"}
                    onChange={() => setWageType("시급")}
                    className="h-4 w-4 accent-[#1e2a5a]"
                  />
                  <span className="text-sm">시급</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="directWageType"
                    checked={wageType === "일급"}
                    onChange={() => setWageType("일급")}
                    className="h-4 w-4 accent-[#1e2a5a]"
                  />
                  <span className="text-sm">일급</span>
                </label>
              </div>
            </div>

            {/* 금액 입력 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                {wageType === "시급" ? "시급" : "일급"} 금액
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={wageAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, "");
                    setWageAmount(raw);
                  }}
                  placeholder="금액을 입력해 주세요"
                  className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 shrink-0">원</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button
                className="flex-1 bg-[#1e2a5a] hover:bg-[#2a3a7a] disabled:opacity-50"
                onClick={() => setStep("contract")}
                disabled={!isFormValid}
              >
                계약서 작성
              </Button>
            </div>
          </div>
        ) : step === "contract" ? (
          <div>
            {/* 타이틀 */}
            <div className="bg-[#1e2a5a] py-6 text-center">
              <h1 className="text-xl font-bold text-white">근로계약서 작성(급여신청)</h1>
              <p className="mt-1 text-sm text-blue-200">일일근로계약서 (별도근무)</p>
            </div>

            <div className="p-5 space-y-5">
              {/* 사용자 */}
              <div className="overflow-hidden rounded border">
                <SectionHeader>사용자</SectionHeader>
                <TableRow label="회사명" value="휴멘드 에이치알" label2="연락처" value2="02-875-8332" />
                <TableRow label="소재지" value="서울시 동작구 현충로151, 105호" />
              </div>

              {/* 근로자 */}
              <div className="overflow-hidden rounded border">
                <SectionHeader>근로자</SectionHeader>
                <TableRow label="성명" value={worker.name} label2="주민등록번호" value2={rrn || "-"} />
                <TableRow label="휴대전화" value={formatPhone(worker.phone)} label2="주소" value2={worker.region || "-"} />
              </div>

              {/* 근무 정보 */}
              <div className="overflow-hidden rounded border">
                <SectionHeader>근무지 및 근무일시</SectionHeader>
                <TableRow label="근무장소" value={clientName} />
                <TableRow label="근무일" value={workDate} />
                <TableRow label="근무시간" value={`${startTime} ~ ${endTime}`} />
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <p>※ 근무시간은 시작시간과 종료 시간으로 기입해주세요.</p>
                <p>※ 휴게시간: 8시간 미만시 30분제공 / 8시간 이상시 1시간 제공</p>
                <p>※ 단, 휴게시간은 행사 성격에 따라 변경될 수 있으며, 휴게시간은 임금에 산정하지 않는다.</p>
              </div>

              {/* 계약 조건 */}
              <div className="overflow-hidden rounded border">
                <SectionHeader>계약 조건</SectionHeader>
                <div className="space-y-4 p-4 text-sm leading-relaxed text-gray-700">
                  <div>
                    <p className="font-semibold text-gray-900">1. 계약기간</p>
                    <p>본 계약은 1일 단위의 체결이며, 업무시간 종료시 자동 계약만료된다.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">2. 근무장소</p>
                    <p>위 사용자와 근로자가 협의한 위 근무장소.(본인사정으로 인한 변동시 바뀔수 있음)</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">3. 해당업무</p>
                    <p>사용자와 근로자가 사전에 협의한 업무. [ 홀서빙, 주방보조, 기물보조, 안내 등]</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">4. 계약일</p>
                    <p>계약일시: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "")}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">5. 근로임금</p>
                    <div className="mt-2 overflow-hidden rounded border">
                      <div className="flex border-b text-xs">
                        <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">급여 구분</div>
                        <div className="px-2 py-1.5">{wageType}</div>
                      </div>
                      <div className="flex border-b text-xs">
                        <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">{wageType === "일급" ? "기본급" : "기본시급"}</div>
                        <div className="px-2 py-1.5">{displayWage.toLocaleString()} 원</div>
                      </div>
                      <div className="flex border-b text-xs">
                        <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">인건비 구성</div>
                        <div className="px-2 py-1.5">{wageType === "일급" ? `기본급 ${displayWage.toLocaleString()}원 기타수당 0원` : `통상시급 ${displayWage.toLocaleString()}원 기타수당 0원`}</div>
                      </div>
                      <div className="flex text-xs">
                        <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">급여산정</div>
                        <div className="px-2 py-1.5">{wageType === "일급" ? "기본급=1일임금" : "기본시급x(근무시간-공제시간)=1일임금"}</div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{wageType === "일급" ? "※ 기본급은 홈페이지에 공지된 일급이며 별도의 안내를 받으신분은 따로 기입후 지급됨" : "※ 기본시급은 홈페이지에 공지된 시급이며 별도의 안내를 받으신분은 따로 기입후 지급됨"}</p>
                    <p className="text-xs text-gray-500">※ 임금은 근무 후 익 주 월~수요일 19시 지급이며 근무업장 사정에 따라 최대 7일, 최소 2시간 지연 입금 될 수 있다.</p>
                    <p className="text-xs text-gray-500">※ 신한은행 외 타행으로 급여이체 받을 시 이체수수료 500원이 공제되어 지급됩니다</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">6. 적용제외</p>
                    <p>근로기준법상 단기간 근로자는 근로기준법의 주휴일, 연차휴가, 퇴직금 규정을 적용하지 아니하며, 기타 관련 사항은 회사 규정에 따른다.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">7. 사회보험료 및 소득세</p>
                    <p>임금지급 시 근로자부담금인 고용보험료[급여액의 0.65%]는 공제 후 입금된다.</p>
                    <div className="mt-2 overflow-hidden rounded border">
                      <div className="flex border-b text-xs">
                        <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">{wageType === "일급" ? "기본급" : "기본시급"}</div>
                        <div className="px-2 py-1.5">{displayWage.toLocaleString()} 원</div>
                      </div>
                      <div className="flex border-b text-xs">
                        <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">인건비 구성</div>
                        <div className="px-2 py-1.5">{wageType === "일급" ? `기본급 ${displayWage.toLocaleString()}원 기타수당 0원` : `통상시급 ${displayWage.toLocaleString()}원 기타수당 0원`}</div>
                      </div>
                      <div className="flex text-xs">
                        <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">급여산정</div>
                        <div className="px-2 py-1.5">{wageType === "일급" ? "기본급=1일임금" : "기본시급x(근무시간-공제시간)=1일임금"}</div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">※ 임금 지급시 근로자 부담금 (사회보험료와 소득세) 은 원천징수 후 근무자가 지정한 예금통장으로 지급한다.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">8. 손해배상</p>
                    <p>근로자가 업무수행 중 업무와 무관하게 고의 또는 중과실로 사용자 와 근무장소에 재산상의 손해를 끼쳤을 때에는 원상회복 또는 손해배상을 하여야 한다.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">9. 기타사항</p>
                    <p>본 계약에 명시하지 아니한 사항은 사용자가 별도로 정한 회사규정 및 근로기준법 등을 적용한다.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">10. 개인정보</p>
                    <p>본 계약과 관련하여 사용자는 위 개인정보를 엄격히 관리하며, 근로자는 위 사용자가 DB(회원관리) 및 근로소득관련 제출증빙 등으로 근로자의 개인정보 보관 등에 관하여 동의한다.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">11. 근로계약서 교부</p>
                    <p>&ldquo;갑&rdquo;은 근로계약을 체결함과 동시에 본 계약서를 &ldquo;을&rdquo;의 교부요구와 관계없이 &ldquo;을&rdquo;에게 교부하며(근로기준법 제 17조 이행) &ldquo;을&rdquo;은 홈페이지→마이페이지에서 교부된 계약서를 확인 및 출력할 수 있다.</p>
                  </div>
                </div>
              </div>

              <div className="pb-2 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border p-3.5 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-gray-300 text-[#1e2a5a] focus:ring-[#1e2a5a] accent-[#1e2a5a]"
                  />
                  <span className="text-sm font-medium text-gray-700">본 계약에 동의하고 제출 하시겠습니까?</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                    이전으로
                  </Button>
                  <Button
                    className="flex-1 bg-[#1e2a5a] hover:bg-[#2a3a7a] disabled:opacity-50"
                    onClick={() => setStep("sign")}
                    disabled={!agreed}
                  >
                    동의하고 서명하기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold">전자서명</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {clientName} / {workDate} 계약
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground">마우스 또는 손가락으로 서명하세요</p>
            <SignaturePad onSave={handleSign} loading={loading} />
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep("contract")} disabled={loading}>
              이전으로
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

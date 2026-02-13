"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { FileText, XIcon } from "lucide-react";
import { type WorkRecord } from "@/lib/supabase/queries";

interface WorkerInfo {
  name: string;
  rrnFront: string;
  rrnBack: string;
  phone: string;
  region: string;
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

export function ContractViewModal({ record, worker, signatureUrl }: { record: WorkRecord; worker: WorkerInfo; signatureUrl?: string | null }) {
  const [open, setOpen] = useState(false);

  const p = record.payments;
  const display = p ?? record;
  const rrn = worker.rrnFront && worker.rrnBack ? `${worker.rrnFront}-${worker.rrnBack}` : "";

  function formatPhone(phone: string) {
    const nums = phone.replace(/\D/g, "");
    if (nums.length === 11) return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
    return phone;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 px-2 text-xs rounded-none bg-emerald-600 text-white hover:bg-emerald-700">
          <FileText className="mr-1 h-3 w-3" />
          근로계약서
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="!max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <VisuallyHidden><DialogTitle>근로계약서</DialogTitle></VisuallyHidden>
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 z-10 text-white hover:opacity-80"
        >
          <XIcon className="h-5 w-5" />
        </button>
        {/* 타이틀 */}
        <div className="bg-[#1e2a5a] py-6 text-center">
          <h1 className="text-xl font-bold text-white">근로계약서</h1>
          <p className="mt-1 text-sm text-blue-200">일일근로계약서</p>
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
            <SectionHeader>근무 정보</SectionHeader>
            <TableRow label="근무장소" value={record.client_name} />
            <TableRow label="근무일" value={record.work_date} />
            <TableRow label="근무시간" value={`${record.start_time.slice(0, 5)} ~ ${record.end_time.slice(0, 5)}`} />
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
                <p className="font-semibold text-gray-900">4. 계약기간</p>

                <p>근무일: {record.work_date}</p>
                <p>근무시간: {record.start_time.slice(0, 5)} ~ {record.end_time.slice(0, 5)}</p>
                <p>휴게시간: 8시간 미만시 30분제공 / 8시간 이상시 1시간 제공</p>
                <p className="mt-1 text-xs text-gray-500">※ 단, 휴게시간은 행사 성격에 따라 변경될 수 있으며, 휴게시간은 임금에 산정하지 않는다.</p>
                <p className="text-xs text-gray-500">※ 근무시간은 실제로 근무한 시간을 기입해주세요.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">5. 근로임금</p>
                <div className="mt-2 overflow-hidden rounded border">
                  <div className="flex border-b text-xs">
                    <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">급여 구분</div>
                    <div className="px-2 py-1.5">시급</div>
                  </div>
                  <div className="flex border-b text-xs">
                    <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">기본시급</div>
                    <div className="px-2 py-1.5">{display.hourly_wage.toLocaleString()} 원</div>
                  </div>
                  <div className="flex border-b text-xs">
                    <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">인건비 구성</div>
                    <div className="px-2 py-1.5">통상시급 {display.hourly_wage.toLocaleString()}원 기타수당 0원</div>
                  </div>
                  <div className="flex text-xs">
                    <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">급여산정</div>
                    <div className="px-2 py-1.5">기본시급x(근무시간-공제시간)=1일임금</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">※ 기본시급은 홈페이지에 공지된 시급이며 별도의 안내를 받으신분은 따로 기입후 지급됨</p>
                <p className="text-xs text-gray-500">※ 임금은 근무 후 익 주 월~수요일 19시 지급이며 근무업장 사정에 따라 최대 7일, 최소 2시간 지연 입금 될 수 있다.</p>
                <p className="text-xs text-gray-500">※ 신한은행 외 타행으로 급여이체 받을 시 이체수수료 500원이 공제되어 지급됩니다</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">6. 적용제외</p>
                <p>근로기준법상 단기간 근로자는 근로기준법의 주휴일, 연차휴가, 퇴직금 규정을 적용하지 아니하며, 기타 관련 사항은 회사 규정에 따른다.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">7. 고용보험</p>
                <p>임금지급 시 근로자부담금인 고용보험료[급여액의 0.65%]는 공제 후 입금된다.</p>
                <div className="mt-2 overflow-hidden rounded border">
                  <div className="flex border-b text-xs">
                    <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">기본시급</div>
                    <div className="px-2 py-1.5">{display.hourly_wage.toLocaleString()} 원</div>
                  </div>
                  <div className="flex border-b text-xs">
                    <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">인건비 구성</div>
                    <div className="px-2 py-1.5">통상시급 {display.hourly_wage.toLocaleString()}원 기타수당 0원</div>
                  </div>
                  <div className="flex text-xs">
                    <div className="w-24 shrink-0 bg-gray-100 px-2 py-1.5 font-medium border-r">급여산정</div>
                    <div className="px-2 py-1.5">기본시급x(근무시간-공제시간)=1일임금</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">※ 임금지급 시 근로자부담분인 고용보험료(급여액의 0.65%)는 공제 후 지급 됩니다.</p>
                <p className="text-xs text-gray-500">※ 임금은 근무 후 익 주 월~수요일 19시 지급이며 근무업장 사정에 따라 최대 7일, 최소 2시간 지연 입금 될 수 있다.</p>
                <p className="text-xs text-gray-500">※ 신한은행 외 타행으로 급여이체 받을 시 이체수수료 500원이 공제되어 지급됩니다</p>
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

          {/* 사용자 서명 */}
          <div className="text-sm">
            <p className="font-semibold">사용자</p>
            <p className="mt-1">휴멘드 에이치알 <span className="font-bold">이 혁</span></p>
          </div>

          {/* 근로자 */}
          <div className="overflow-hidden rounded border">
            <SectionHeader>근로자</SectionHeader>
            <TableRow label="이름" value={worker.name} />
            <TableRow label="주민등록번호" value={rrn || "-"} />
            {record.signature_url && (
              <div className="flex border-b text-sm">
                <div className="w-28 shrink-0 bg-gray-100 px-3 py-2 font-medium text-gray-600 border-r">서명</div>
                <div className="flex-1 px-3 py-2">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="서명" className="h-16" />
                  ) : (
                    <span className="text-sm text-green-700 font-medium">서명 완료</span>
                  )}
                </div>
              </div>
            )}
            {record.signed_at && (
              <TableRow label="서명일시" value={new Date(record.signed_at).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatPhone, formatWage } from "@/lib/utils/format";
import { ApplicationActions, RevertAction } from "./application-actions";
import { MemberDetailModal } from "../members/member-detail-modal";
import { batchApproveApplications } from "./actions";
import { toast } from "sonner";
import type { Member } from "@/lib/supabase/queries";
import { getMemberDetail } from "../payments/actions";

const PAGE_SIZE = 20;

const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  "대기": { label: "대기중", variant: "secondary" },
  "승인": { label: "승인", variant: "default" },
  "거절": { label: "거절", variant: "destructive" },
  "취소": { label: "취소됨", variant: "secondary" },
};

interface AppItem {
  id: string;
  member_id: string;
  status: string;
  members: { name: string; phone: string } | null;
  job_postings: {
    work_date: string;
    start_time: string;
    end_time: string;
    clients: {
      company_name: string;
      hourly_wage: number;
    };
  };
}

interface ApplicationTableProps {
  apps: AppItem[];
  showActions?: boolean;
  membersMap: Record<string, Member>;
  profileImageUrls: Record<string, string>;
}

export function ApplicationTable({ apps, showActions, membersMap, profileImageUrls }: ApplicationTableProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedProfileUrl, setSelectedProfileUrl] = useState<string | null>(null);
  const [isLoadingProfile, startProfileTransition] = useTransition();
  const [filterStartDate, setFilterStartDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  function handleMemberClick(member: Member) {
    setSelectedMember(member);
    setSelectedProfileUrl(null);
    startProfileTransition(async () => {
      const { profileImageUrl } = await getMemberDetail(member.id);
      setSelectedProfileUrl(profileImageUrl);
    });
  }
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const clientNames = useMemo(() => {
    const names = Array.from(new Set(apps.map((a) => a.job_postings.clients.company_name)));
    names.sort();
    return names;
  }, [apps]);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      const d = a.job_postings.work_date;
      if (filterStartDate && d < filterStartDate) return false;
      if (filterEndDate && d > filterEndDate) return false;
      if (filterClient !== "all" && a.job_postings.clients.company_name !== filterClient) return false;
      return true;
    });
  }, [apps, filterStartDate, filterEndDate, filterClient]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedApps = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const pendingFilteredIds = useMemo(
    () => paginatedApps.filter((a) => a.status === "대기").map((a) => a.id),
    [paginatedApps]
  );

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(pendingFilteredIds) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleBatchApprove() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const result = await batchApproveApplications(ids);
      if (result.failed === 0) {
        toast.success(`${result.success}건 일괄 승인 완료`);
      } else {
        toast.warning(`성공 ${result.success}건 / 실패 ${result.failed}건`);
      }
      setSelectedIds(new Set());
    } catch {
      toast.error("일괄 승인 중 오류가 발생했습니다.");
    } finally {
      setBatchLoading(false);
    }
  }

  if (apps.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        지원 내역이 없습니다.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Input
          type="date"
          value={filterStartDate}
          onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
          className="w-[145px] h-9 text-sm"
        />
        <span className="text-xs text-muted-foreground">~</span>
        <Input
          type="date"
          value={filterEndDate}
          onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
          className="w-[145px] h-9 text-sm"
        />
        <Select value={filterClient} onValueChange={(v) => { setFilterClient(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="근무지 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 근무지</SelectItem>
            {clientNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterStartDate || filterEndDate || filterClient !== "all") && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setFilterStartDate(""); setFilterEndDate(""); setFilterClient("all"); setCurrentPage(1); }}
          >
            초기화
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length}건</span>
      </div>
      {showActions && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size}건 선택됨</span>
          <Button
            size="sm"
            onClick={handleBatchApprove}
            disabled={batchLoading}
          >
            {batchLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            일괄 승인
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            {showActions && <col className="w-[40px]" />}
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[70px]" />
            <col className="w-[120px] hidden md:table-column" />
            <col className="w-[90px]" />
            <col className="w-[80px] hidden md:table-column" />
            <col className="w-[70px]" />
            {showActions && <col className="w-[80px]" />}
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/50 text-center">
              {showActions && (
                <th className="px-2 py-3">
                  <Checkbox
                    checked={pendingFilteredIds.length > 0 && pendingFilteredIds.every((id) => selectedIds.has(id))}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                    aria-label="전체 선택"
                  />
                </th>
              )}
              <th className="px-2 py-3 font-medium">근무일</th>
              <th className="px-2 py-3 font-medium">근무시간</th>
              <th className="px-2 py-3 font-medium">이름</th>
              <th className="hidden px-2 py-3 font-medium md:table-cell">전화번호</th>
              <th className="px-2 py-3 font-medium">근무지</th>
              <th className="hidden px-2 py-3 font-medium md:table-cell">시급</th>
              <th className="px-2 py-3 font-medium">상태</th>
              {showActions && <th className="px-2 py-3 font-medium">처리</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={showActions ? 9 : 7} className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</td></tr>
            ) : null}
            {paginatedApps.map((app) => {
              const config = statusConfig[app.status] ?? statusConfig["대기"];
              const member = membersMap[app.member_id];
              return (
                <tr key={app.id} className="border-b last:border-0">
                  {showActions && (
                    <td className="px-2 py-3 text-center">
                      {app.status === "대기" ? (
                        <Checkbox
                          checked={selectedIds.has(app.id)}
                          onCheckedChange={(checked) => toggleOne(app.id, !!checked)}
                          aria-label={`${app.members?.name ?? ""} 선택`}
                        />
                      ) : null}
                    </td>
                  )}
                  <td className="px-2 py-3 text-center whitespace-nowrap">{formatDate(app.job_postings.work_date)}</td>
                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    {app.job_postings.start_time?.slice(0, 5)}~{app.job_postings.end_time?.slice(0, 5)}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {member ? (
                      <button
                        type="button"
                        className="font-medium text-blue-600 hover:underline"
                        onClick={() => handleMemberClick(member)}
                      >
                        {app.members?.name ?? "-"}
                      </button>
                    ) : (
                      <span className="font-medium">{app.members?.name ?? "-"}</span>
                    )}
                  </td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground md:table-cell">
                    {app.members ? formatPhone(app.members.phone) : "-"}
                  </td>
                  <td className="px-2 py-3 text-center">{app.job_postings.clients.company_name}</td>
                  <td className="hidden px-2 py-3 text-center text-muted-foreground md:table-cell">
                    {formatWage(app.job_postings.clients.hourly_wage)}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                  </td>
                  {showActions && (
                    <td className="px-2 py-3 text-center">
                      {app.status === "대기" && <ApplicationActions applicationId={app.id} />}
                      {(app.status === "승인" || app.status === "거절") && <RevertAction applicationId={app.id} />}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 border-t px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
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
                  variant={item === currentPage ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(item)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {item}
                </Button>
              )
            )}
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
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
    </>
  );
}

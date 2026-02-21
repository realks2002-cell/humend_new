"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatPhone, formatWage } from "@/lib/utils/format";
import { ApplicationActions } from "./application-actions";
import { MemberDetailModal } from "../members/member-detail-modal";
import type { Member } from "@/lib/supabase/queries";

const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  "대기": { label: "대기중", variant: "secondary" },
  "승인": { label: "승인", variant: "default" },
  "거절": { label: "거절", variant: "destructive" },
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
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterClient, setFilterClient] = useState("all");

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
        <Select value={filterClient} onValueChange={setFilterClient}>
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
            onClick={() => { setFilterStartDate(""); setFilterEndDate(""); setFilterClient("all"); }}
          >
            초기화
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length}건</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
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
              <tr><td colSpan={showActions ? 8 : 7} className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</td></tr>
            ) : null}
            {filtered.map((app) => {
              const config = statusConfig[app.status] ?? statusConfig["대기"];
              const member = membersMap[app.member_id];
              return (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="px-2 py-3 text-center whitespace-nowrap">{formatDate(app.job_postings.work_date)}</td>
                  <td className="px-2 py-3 text-center whitespace-nowrap">
                    {app.job_postings.start_time?.slice(0, 5)}~{app.job_postings.end_time?.slice(0, 5)}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {member ? (
                      <button
                        type="button"
                        className="font-medium text-blue-600 hover:underline"
                        onClick={() => setSelectedMember(member)}
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
                    </td>
                  )}
                </tr>
              );
            })}
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
    </>
  );
}

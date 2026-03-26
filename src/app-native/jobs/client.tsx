"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Briefcase, Search, Loader2, Clock, Calendar, X } from "lucide-react";
import { formatDate, formatTime, formatDateRange, formatWorkDays, formatClientWage } from "@/lib/utils/format";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { getClientsWithJobs } from "@/lib/native-api/queries";
import type { ClientWithJobs } from "@/lib/native-api/queries";

export default function JobsClient() {
  const searchParams = useSearchParams();
  const [allClients, setAllClients] = useState<ClientWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterClient, setFilterClient] = useState("");

  useEffect(() => {
    getClientsWithJobs()
      .then(setAllClients)
      .finally(() => setLoading(false));
  }, []);

  const from = filterFrom || searchParams.get("from");
  const to = filterTo || searchParams.get("to");
  const clientFilter = filterClient || searchParams.get("client");

  let clientsWithJobs = allClients;
  if (clientFilter) {
    clientsWithJobs = clientsWithJobs.filter((c) => c.id === clientFilter);
  }
  if (from || to) {
    clientsWithJobs = clientsWithJobs
      .map((c) => ({
        ...c,
        job_postings: c.job_postings.filter((j) => {
          if (j.posting_type === "fixed_term" && j.start_date && j.end_date) {
            if (from && j.end_date < from) return false;
            if (to && j.start_date > to) return false;
            return true;
          }
          if (from && j.work_date < from) return false;
          if (to && j.work_date > to) return false;
          return true;
        }),
      }))
      .filter((c) => c.job_postings.length > 0);
  }

  const hasFilters = !!(from || to || clientFilter);
  const clientNames = allClients.map((c) => ({ id: c.id, name: c.company_name }));

  const clearFilters = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterClient("");
  };

  // 기간제 공고를 별도 수집하고, 일별 전용 고객사 목록 생성
  const allFixedTermJobs: { client: ClientWithJobs; job: ClientWithJobs["job_postings"][number] }[] = [];
  const dailyOnlyClients = clientsWithJobs
    .map((client) => {
      const dailyJobs = client.job_postings.filter((j) => j.posting_type !== "fixed_term");
      const fixedJobs = client.job_postings.filter((j) => j.posting_type === "fixed_term");
      fixedJobs.forEach((job) => allFixedTermJobs.push({ client, job }));
      return { ...client, job_postings: dailyJobs };
    })
    .filter((c) => c.job_postings.length > 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center px-6 h-14">
        <img src="/logo.png" alt="HUMAN:D" className="h-4 w-auto" />
      </header>

      <div className="px-4 py-6 pb-32">
      <h1 className="text-2xl font-bold mb-3">알바공고</h1>

      <div className="mb-4 flex items-center gap-1">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="h-8 min-w-[70px] flex-1 text-xs">
            <SelectValue placeholder="근무지" />
          </SelectTrigger>
          <SelectContent>
            {clientNames.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="h-8 w-[85px] shrink-0 text-[10px] px-1 opacity-50"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
        />
        <span className="text-[10px] text-muted-foreground">~</span>
        <Input
          type="date"
          className="h-8 w-[85px] shrink-0 text-[10px] px-1 opacity-50"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
        />
        <Button size="sm" className="h-8 shrink-0 bg-[#830020] hover:bg-[#a61d33] text-white text-[10px] px-2" onClick={() => {}}>
          검색
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {dailyOnlyClients.length === 0 && allFixedTermJobs.length === 0 ? (
        <Card className="py-20 text-center">
          <CardContent>
            <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              {hasFilters
                ? "조건에 맞는 공고가 없습니다"
                : "현재 등록된 알바공고가 없습니다"}
            </p>
            {hasFilters && (
              <Link href="/jobs">
                <Button variant="outline" size="sm" className="mt-4">
                  필터 초기화
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {dailyOnlyClients.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dailyOnlyClients.map((client) => (
                <Card
                  key={client.id}
                  className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg py-0 rounded-[10px]"
                >
                  <Link href={`/jobs/detail?client=${client.id}`}>
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/5 to-primary/15">
                      {client.main_image_url ? (
                        <img
                          src={client.main_image_url}
                          alt={client.company_name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Briefcase className="h-12 w-12 text-primary/25" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link href={`/jobs/detail?client=${client.id}`}>
                      <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
                        {client.company_name}
                      </h3>
                    </Link>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {client.location}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-medium text-primary">
                        {formatClientWage(client)}
                      </span>
                      <Badge variant="secondary">
                        {client.job_postings.length}건 모집중
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-1.5">
                      {client.job_postings.map((job) => (
                        <div
                          key={job.id}
                          className="flex flex-col items-center gap-1 rounded-lg border p-2 text-center"
                        >
                          <span className="text-[11px] font-medium">
                            {formatDate(job.work_date)}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground">
                            {formatTime(job.start_time)}~{formatTime(job.end_time)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">모집 {job.headcount}명</span>
                          <ApplyButton
                            postingId={job.id}
                            clientName={client.company_name}
                            workDate={formatDate(job.work_date)}
                            startTime={job.start_time}
                            endTime={job.end_time}
                            size="sm"
                            className="h-5.5 text-[10px] px-2 w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 기간제 알바 별도 섹션 */}
          {allFixedTermJobs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">기간제 알바</h2>
              <div className="space-y-3">
                {allFixedTermJobs.map(({ client, job }) => (
                  <div
                    key={job.id}
                    className="rounded-xl border-2 border-[#134E8E]/30 bg-[#134E8E]/5 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-[#134E8E]/15 text-[#134E8E] border-0 text-[10px] font-semibold">
                        기간제
                      </Badge>
                      <span className="font-semibold text-sm">{client.company_name}</span>
                      {job.title && (
                        <span className="text-xs font-medium text-[#134E8E] truncate">
                          {job.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <MapPin className="h-3 w-3" />
                      {client.location}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#134E8E]">
                      <Calendar className="h-3 w-3" />
                      {job.start_date && job.end_date
                        ? formatDateRange(job.start_date, job.end_date)
                        : formatDate(job.work_date)}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {job.work_days && (
                          <span>{formatWorkDays(job.work_days)}</span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(job.start_time)}~{formatTime(job.end_time)}
                        </span>
                        <span className="font-medium text-primary">
                          {formatClientWage(client)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{job.headcount}명</span>
                    </div>
                    <div className="mt-2">
                      <ApplyButton
                        postingId={job.id}
                        clientName={client.company_name}
                        workDate={
                          job.start_date && job.end_date
                            ? formatDateRange(job.start_date, job.end_date)
                            : formatDate(job.work_date)
                        }
                        startTime={job.start_time}
                        endTime={job.end_time}
                        isFixedTerm
                        workDays={job.work_days ?? undefined}
                        size="sm"
                        className="h-6 text-[11px] px-3 w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

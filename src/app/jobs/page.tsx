export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Briefcase, Search, Calendar } from "lucide-react";
import { getClientsWithJobs } from "@/lib/supabase/queries";
import { formatDate, formatClientWage, formatTime, formatDateRange, formatWorkDays } from "@/lib/utils/format";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { JobFilters } from "./filters";
import { JobTabs } from "./tabs";

interface Props {
  searchParams: Promise<{ from?: string; to?: string; client?: string }>;
}

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams;
  const allClients = await getClientsWithJobs();

  // 드롭박스용 고객사 목록 (필터 전 전체 목록)
  const clientNames = allClients.map((c) => ({ id: c.id, name: c.company_name }));

  // 필터 적용
  let clientsWithJobs = allClients;

  if (params.client) {
    clientsWithJobs = clientsWithJobs.filter((c) => c.id === params.client);
  }

  if (params.from || params.to) {
    clientsWithJobs = clientsWithJobs
      .map((c) => ({
        ...c,
        job_postings: c.job_postings.filter((j) => {
          if (j.posting_type === "fixed_term" && j.start_date && j.end_date) {
            // 기간제: 범위 겹침 체크
            if (params.from && j.end_date < params.from) return false;
            if (params.to && j.start_date > params.to) return false;
            return true;
          }
          // daily: 기존 로직
          if (params.from && j.work_date < params.from) return false;
          if (params.to && j.work_date > params.to) return false;
          return true;
        }),
      }))
      .filter((c) => c.job_postings.length > 0);
  }

  const hasFilters = !!(params.from || params.to || params.client);

  // 일반(daily) 공고만 있는 고객사
  const dailyClients = clientsWithJobs
    .map((c) => ({
      ...c,
      job_postings: c.job_postings.filter((j) => j.posting_type !== "fixed_term"),
    }))
    .filter((c) => c.job_postings.length > 0);

  // 기간제(fixed_term) 공고만 있는 고객사
  const fixedTermClients = clientsWithJobs
    .map((c) => ({
      ...c,
      job_postings: c.job_postings.filter((j) => j.posting_type === "fixed_term"),
    }))
    .filter((c) => c.job_postings.length > 0);

  const noResults = dailyClients.length === 0 && fixedTermClients.length === 0;

  return (
    <div className="jobs-page-container mx-auto max-w-7xl animate-in fade-in duration-500 px-4 py-8 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-xl font-bold md:text-2xl">알바공고</h1>
        <p className="mt-1 text-muted-foreground">
          원하는 날짜에 지원하고, 바로 일하세요.
        </p>
      </div>

      {/* Filters */}
      <JobFilters clientNames={clientNames} />

      {noResults ? (
        <Card className="py-20 text-center">
          <CardContent>
            <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              {hasFilters ? "조건에 맞는 공고가 없습니다" : "현재 등록된 알바공고가 없습니다"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              {hasFilters ? "필터 조건을 변경해 보세요." : "새로운 공고가 등록되면 여기에 표시됩니다."}
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
        <JobTabs>
          {/* child[0]: 시급제 */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dailyClients.map((client) => (
              <Card key={client.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg py-0 rounded-[10px]">
                <Link href={`/jobs/${client.id}`}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/5 to-primary/15">
                    {client.main_image_url ? (
                      <Image
                        src={client.main_image_url}
                        alt={client.company_name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Briefcase className="h-12 w-12 text-primary/25 transition-transform group-hover:scale-110" />
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link href={`/jobs/${client.id}`}>
                    <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">{client.company_name}</h3>
                  </Link>
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {client.location}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-medium text-primary">{formatClientWage(client)}</span>
                    <Badge variant="secondary">{client.job_postings.length}건 모집중</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    {client.job_postings.map((job) => (
                      <div key={job.id} className="flex flex-col items-center gap-1 rounded-lg border p-2 text-center">
                        <span className="text-[11px] font-medium">{formatDate(job.work_date)}</span>
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

          {/* child[1]: 기간제 */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fixedTermClients.map((client) =>
              client.job_postings.map((job) => (
                <Card key={job.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg rounded-[10px] border-2 border-violet-200">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Link href={`/jobs/${client.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-violet-50 to-violet-100">
                        {client.main_image_url ? (
                          <Image
                            src={client.main_image_url}
                            alt={client.company_name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Briefcase className="h-7 w-7 text-violet-400" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-violet-500/15 text-violet-700 border-0 text-[10px] font-semibold">
                            기간제
                          </Badge>
                          {job.title && (
                            <span className="text-xs font-medium text-violet-700 truncate">
                              {job.title}
                            </span>
                          )}
                        </div>
                        <Link href={`/jobs/${client.id}`}>
                          <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">{client.company_name}</h3>
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {client.location}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {job.start_date && job.end_date
                          ? formatDateRange(job.start_date, job.end_date)
                          : formatDate(job.work_date)}
                      </span>
                      {job.work_days && (
                        <span>{formatWorkDays(job.work_days)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(job.start_time)}~{formatTime(job.end_time)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-medium text-primary">{formatClientWage(client)}</span>
                      <Badge variant="secondary">{job.headcount}명 모집</Badge>
                    </div>
                    <div className="mt-3">
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
                        className="h-7 text-[11px] px-3 w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </JobTabs>
      )}
    </div>
  );
}

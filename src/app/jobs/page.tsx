export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Briefcase, Search } from "lucide-react";
import { getClientsWithJobs } from "@/lib/supabase/queries";
import { formatDate, formatWage, formatTime } from "@/lib/utils/format";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { JobFilters } from "./filters";

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams;
  const allClients = await getClientsWithJobs();

  // 필터 적용
  let clientsWithJobs = allClients;

  if (params.from || params.to) {
    clientsWithJobs = clientsWithJobs
      .map((c) => ({
        ...c,
        job_postings: c.job_postings.filter((j) => {
          if (params.from && j.work_date < params.from) return false;
          if (params.to && j.work_date > params.to) return false;
          return true;
        }),
      }))
      .filter((c) => c.job_postings.length > 0);
  }

  const hasFilters = !!(params.from || params.to);

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in duration-500 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">채용공고</h1>
        <p className="mt-1 text-muted-foreground">
          원하는 날짜에 지원하고, 바로 일하세요.
        </p>
      </div>

      {/* Filters */}
      <JobFilters />

      {clientsWithJobs.length === 0 ? (
        <Card className="py-20 text-center">
          <CardContent>
            <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              {hasFilters ? "조건에 맞는 공고가 없습니다" : "현재 등록된 채용공고가 없습니다"}
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clientsWithJobs.map((client) => (
            <Card key={client.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <Link href={`/jobs/${client.id}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/5 to-primary/15">
                  {client.main_image_url ? (
                    <Image
                      src={client.main_image_url}
                      alt={client.company_name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Briefcase className="h-12 w-12 text-primary/25 transition-transform group-hover:scale-110" />
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="pt-4">
                <Link href={`/jobs/${client.id}`}>
                  <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">{client.company_name}</h3>
                </Link>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {client.location}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-medium text-primary">시급 {formatWage(client.hourly_wage)}</span>
                  <Badge variant="secondary">{client.job_postings.length}건 모집중</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {Object.entries(
                    client.job_postings.reduce<Record<string, typeof client.job_postings>>((acc, job) => {
                      (acc[job.work_date] ||= []).push(job);
                      return acc;
                    }, {})
                  ).map(([date, jobs]) => (
                    <div key={date} className="rounded-lg border p-2.5">
                      <Badge variant="outline" className="mb-1.5 text-xs">
                        {formatDate(date)}
                      </Badge>
                      <div className="space-y-1.5">
                        {jobs.map((job) => (
                          <div key={job.id} className="flex items-center justify-between rounded-md transition-colors hover:bg-muted/30 px-1 py-0.5">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="mr-0.5 h-3 w-3" />
                              {formatTime(job.start_time)}~{formatTime(job.end_time)}
                            </Badge>
                            <ApplyButton
                              postingId={job.id}
                              clientName={client.company_name}
                              workDate={formatDate(job.work_date)}
                              startTime={job.start_time}
                              endTime={job.end_time}
                              size="sm"
                              className="h-5.5 text-[10px] px-2"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

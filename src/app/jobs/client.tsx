"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Search, Loader2 } from "lucide-react";
import { formatDate, formatWage, formatTime } from "@/lib/utils/format";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { getClientsWithJobs } from "@/lib/native-api/queries";
import type { ClientWithJobs } from "@/lib/native-api/queries";

export default function JobsClient() {
  const searchParams = useSearchParams();
  const [allClients, setAllClients] = useState<ClientWithJobs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientsWithJobs()
      .then(setAllClients)
      .finally(() => setLoading(false));
  }, []);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const clientFilter = searchParams.get("client");

  let clientsWithJobs = allClients;
  if (clientFilter) {
    clientsWithJobs = clientsWithJobs.filter((c) => c.id === clientFilter);
  }
  if (from || to) {
    clientsWithJobs = clientsWithJobs
      .map((c) => ({
        ...c,
        job_postings: c.job_postings.filter((j) => {
          if (from && j.work_date < from) return false;
          if (to && j.work_date > to) return false;
          return true;
        }),
      }))
      .filter((c) => c.job_postings.length > 0);
  }

  const hasFilters = !!(from || to || clientFilter);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">알바공고</h1>
        <p className="mt-1 text-muted-foreground">
          원하는 날짜에 지원하고, 바로 일하세요.
        </p>
      </div>

      {clientsWithJobs.length === 0 ? (
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clientsWithJobs.map((client) => (
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
                    시급 {formatWage(client.hourly_wage)}
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
    </div>
  );
}

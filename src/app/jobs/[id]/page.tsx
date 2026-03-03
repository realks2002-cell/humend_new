export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getClientDetail } from "@/lib/supabase/queries";
import { formatDate, formatClientWage, formatDateRange, formatWorkDays, formatTime } from "@/lib/utils/format";
import { MapPin, Clock, Shirt, BookOpen, Phone, User, Briefcase, UserCheck, Send, ClipboardList, Calendar } from "lucide-react";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { JobDetailMap } from "./job-detail-map";
import { GuideIframe } from "./guide-iframe";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientDetail(id);

  if (!data) {
    notFound();
  }

  const photoUrls = data.client_photos?.sort((a, b) => a.sort_order - b.sort_order).map((p) => p.image_url) ?? [];
  const allImages = photoUrls.length > 0
    ? photoUrls
    : [data.main_image_url].filter(Boolean) as string[];

  // 최대 3장 표시
  const displayImages = allImages.slice(0, 3);

  return (
    <div className="mx-auto max-w-[57.6rem] px-4 py-8">
      {/* 이미지 갤러리 */}
      {displayImages.length > 0 ? (
        <div className={`grid gap-2 ${displayImages.length === 1 ? "" : displayImages.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {displayImages.map((url, i) => (
            <div
              key={url}
              className={`relative overflow-hidden bg-muted ${
                displayImages.length === 1 ? "aspect-[16/9]" : "aspect-[4/3]"
              }`}
            >
              <Image
                src={url}
                alt={`${data.company_name} ${i + 1}`}
                fill
                className="object-cover"
                sizes={displayImages.length === 1 ? "(max-width: 768px) 100vw, 768px" : "33vw"}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <div className="flex h-full items-center justify-center">
            <Briefcase className="h-16 w-16 text-muted-foreground/20" />
          </div>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold">{data.company_name}</h1>
        <div className="mt-2 flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {data.location}
        </div>
        <p className="mt-2 text-xl font-semibold text-primary">
          {formatClientWage(data)}
        </p>

      </div>

      {/* 추가 정보 카드 */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-3 md:flex-col md:items-center md:gap-1 md:py-4">
            <Clock className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">근무타입</p>
            <p className="ml-auto text-sm font-semibold md:ml-0">{data.work_type ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 md:flex-col md:items-center md:gap-1 md:py-4">
            <UserCheck className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">성별</p>
            <p className="ml-auto text-sm font-semibold md:ml-0">{data.gender_requirement ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 md:flex-col md:items-center md:gap-1 md:py-4">
            <Briefcase className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">업무형태</p>
            <p className="ml-auto text-sm font-semibold md:ml-0">{data.work_category ?? "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* 모집 일정 */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">모집 일정</h2>
        {data.job_postings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            현재 모집 중인 일정이 없습니다.
          </p>
        ) : (
          <>
            {/* 일별 공고 */}
            {data.job_postings.filter((j) => j.posting_type !== "fixed_term").length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.job_postings
                  .filter((j) => j.posting_type !== "fixed_term")
                  .map((job) => (
                    <Card key={job.id}>
                      <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
                        <span className="text-sm font-semibold text-foreground">{formatDate(job.work_date)}</span>
                        <span className="flex items-center gap-1 text-sm text-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {job.start_time.slice(0, 5)} ~ {job.end_time.slice(0, 5)}
                        </span>
                        <span className="text-sm text-foreground">모집인원 {job.headcount}명</span>
                        <ApplyButton
                          postingId={job.id}
                          clientName={data.company_name}
                          workDate={formatDate(job.work_date)}
                          startTime={job.start_time}
                          endTime={job.end_time}
                        />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {/* 기간제 공고 */}
            {data.job_postings.filter((j) => j.posting_type === "fixed_term").length > 0 && (
              <div className="mt-4 space-y-3">
                {data.job_postings
                  .filter((j) => j.posting_type === "fixed_term")
                  .map((job) => (
                    <Card key={job.id} className="border-2 border-violet-200 bg-violet-50/30">
                      <CardContent className="flex flex-col gap-2 py-4">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-violet-500/15 text-violet-700 border-0 text-xs font-semibold">
                            기간제
                          </Badge>
                          {job.title && (
                            <span className="text-sm font-medium text-violet-700">{job.title}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-violet-700">
                          <Calendar className="h-4 w-4" />
                          {job.start_date && job.end_date
                            ? formatDateRange(job.start_date, job.end_date)
                            : formatDate(job.work_date)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {job.work_days && (
                            <span>매주 {formatWorkDays(job.work_days)}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(job.start_time)} ~ {formatTime(job.end_time)}
                          </span>
                          <span>모집인원 {job.headcount}명</span>
                        </div>
                        <div className="mt-1">
                          <ApplyButton
                            postingId={job.id}
                            clientName={data.company_name}
                            workDate={
                              job.start_date && job.end_date
                                ? formatDateRange(job.start_date, job.end_date)
                                : formatDate(job.work_date)
                            }
                            startTime={job.start_time}
                            endTime={job.end_time}
                            isFixedTerm
                            workDays={job.work_days ?? undefined}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 설명 */}
      {data.description && (
        <>
          <Separator className="my-6" />
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: data.description }}
          />
        </>
      )}

      <Separator className="my-6" />

      {/* 상세 정보 */}
      <div className="space-y-4">
        {data.dress_code && (
          <div className="flex items-start gap-3">
            <Shirt className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">복장 안내</p>
              <p className="text-sm text-muted-foreground">{data.dress_code}</p>
            </div>
          </div>
        )}
        {data.work_guidelines && (
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">근무 가이드</p>
              {data.work_guidelines.includes('<style>') ? (
                <GuideIframe html={data.work_guidelines} />
              ) : (
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: data.work_guidelines }}
                />
              )}
            </div>
          </div>
        )}
        {data.contact_person && (
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">현장 담당자</p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {data.contact_person}
                {data.contact_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {data.contact_phone}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 카카오맵 */}
      <Separator className="my-6" />
      <div>
        <h2 className="mb-3 text-lg font-semibold">위치</h2>
        <JobDetailMap
          latitude={data.latitude ?? undefined}
          longitude={data.longitude ?? undefined}
        />
      </div>
    </div>
  );
}

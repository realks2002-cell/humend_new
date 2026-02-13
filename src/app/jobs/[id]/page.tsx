export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getClientDetail } from "@/lib/supabase/queries";
import { formatDate, formatWage } from "@/lib/utils/format";
import { MapPin, Clock, Shirt, BookOpen, Phone, User, Briefcase } from "lucide-react";
import { ApplyButton } from "@/components/jobs/ApplyButton";
import { JobDetailMap } from "./job-detail-map";

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 이미지 갤러리 */}
      {displayImages.length > 0 ? (
        <div className={`grid gap-2 ${displayImages.length === 1 ? "" : displayImages.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {displayImages.map((url, i) => (
            <div
              key={url}
              className={`relative overflow-hidden rounded-lg bg-muted ${
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
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
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
          시급 {formatWage(data.hourly_wage)}
        </p>
      </div>

      {/* 설명 */}
      {data.description && (
        <>
          <Separator className="my-6" />
          <div>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </div>
        </>
      )}

      {/* 카카오맵 */}
      {data.latitude && data.longitude && (
        <>
          <Separator className="my-6" />
          <div>
            <h2 className="mb-3 text-lg font-semibold">위치</h2>
            <JobDetailMap
              latitude={data.latitude}
              longitude={data.longitude}
              address={data.location}
            />
          </div>
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
            <div>
              <p className="text-sm font-medium">근무 가이드</p>
              <div
                className="prose prose-sm max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: data.work_guidelines }}
              />
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

      <Separator className="my-6" />

      {/* 날짜 슬롯 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">모집 일정</h2>
        {data.job_postings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            현재 모집 중인 일정이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {data.job_postings.map((job) => (
              <Card key={job.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{formatDate(job.work_date)}</Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {job.start_time.slice(0, 5)} ~ {job.end_time.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{job.headcount}명</span>
                    <ApplyButton
                      postingId={job.id}
                      clientName={data.company_name}
                      workDate={formatDate(job.work_date)}
                      startTime={job.start_time}
                      endTime={job.end_time}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

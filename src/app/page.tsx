export const dynamic = "force-dynamic";

import Link from "next/link";
import dynamic_import from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClientsWithJobs } from "@/lib/supabase/queries";
import { formatDate, formatDateRange, formatWorkDays, formatTime, formatClientWage } from "@/lib/utils/format";
import { Users, Building2, Handshake, ArrowRight, Zap, MapPin, Shield, Briefcase, Search, Calendar, Clock } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import HeroStatsSection from "@/components/home/HeroStatsSection";
import KakaoFloatingButton from "@/components/home/KakaoFloatingButton";

const MobileHome = dynamic_import(() => import("@/components/home/MobileHome"));

const stats = [
  { label: "등록 회원", value: 12000, suffix: "+", icon: Users, photo: "/images/stat-hall.jpg" },
  { label: "제휴 고객사", value: 200, suffix: "+", icon: Building2, photo: "/images/stat-catering.jpg" },
  { label: "매칭 완료", value: 30000, suffix: "+", icon: Handshake, photo: "/images/stat-convention.jpg" },
];

const services = [
  {
    title: "빠른 매칭",
    watermark: "text-[#C66508]/[0.10] group-hover:text-[#C66508]/[0.16]",
    accent: "bg-[#C66508]/10 text-[#C66508] group-hover:bg-[#C66508] group-hover:text-white",
    description: "원하는 날짜에 바로 지원하고, 빠르게 승인받으세요.",
    icon: Zap,
  },
  {
    title: "다양한 현장",
    watermark: "text-[#CF1742]/[0.10] group-hover:text-[#CF1742]/[0.16]",
    accent: "bg-[#CF1742]/10 text-[#CF1742] group-hover:bg-[#CF1742] group-hover:text-white",
    description: "웨딩홀, 케이터링, 컨벤션 등 다양한 근무처를 제공합니다.",
    icon: MapPin,
  },
  {
    title: "투명한 급여",
    watermark: "text-[#058760]/[0.10] group-hover:text-[#058760]/[0.16]",
    accent: "bg-[#058760]/10 text-[#058760] group-hover:bg-[#058760] group-hover:text-white",
    description: "시급 사전 공개, 근무 후 정확한 급여 정산을 보장합니다.",
    icon: Shield,
  },
];

export default async function Home() {
  const clientsWithJobs = await getClientsWithJobs();

  // 일반(daily) 공고가 있는 고객사
  const dailyClients = clientsWithJobs
    .map((c) => ({
      ...c,
      job_postings: c.job_postings.filter((j) => j.posting_type !== "fixed_term"),
    }))
    .filter((c) => c.job_postings.length > 0);

  // 기간제(fixed_term) 공고가 있는 고객사
  const fixedTermClients = clientsWithJobs
    .map((c) => ({
      ...c,
      job_postings: c.job_postings.filter((j) => j.posting_type === "fixed_term"),
    }))
    .filter((c) => c.job_postings.length > 0);

  return (
    <>
    <KakaoFloatingButton />

    {/* 모바일: 네이티브 홈 */}
    <div className="md:hidden">
      <MobileHome />
    </div>

    {/* 데스크톱: 기존 웹 홈 */}
    <div className="hidden md:block animate-in fade-in duration-500">

      {/* Hero */}
      <HeroStatsSection />

      {/* 알바공고 (일별) */}
      <section className="bg-muted/20 py-20">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">알바공고</h2>
              <p className="mt-1 text-muted-foreground">지금 바로 지원할 수 있는 공고</p>
            </div>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">
                전체보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {dailyClients.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent>
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">
                  현재 등록된 알바공고가 없습니다
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  새로운 공고가 등록되면 여기에 표시됩니다
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dailyClients.map((client) => (
                <Link key={client.id} href={`/jobs/${client.id}`}>
                  <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg py-0 rounded-[10px]">
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/5 to-primary/15">
                      {client.main_image_url ? (
                        <img
                          src={client.main_image_url}
                          alt={client.company_name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Briefcase className="h-10 w-10 text-primary/30 transition-transform group-hover:scale-110" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold group-hover:text-primary">{client.company_name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {client.location}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {formatClientWage(client)}
                        </span>
                        <Badge variant="secondary">
                          {client.job_postings.length}건 모집중
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {client.job_postings.slice(0, 3).map((job) => (
                          <Badge key={job.id} variant="outline" className="text-xs">
                            {formatDate(job.work_date)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 기간제 알바 */}
      {fixedTermClients.length > 0 && (
        <section className="px-4 py-20 -mt-[50px]" style={{ backgroundColor: "#FAFAFA" }}>
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold md:text-3xl">기간제 알바</h2>
                <p className="mt-1 text-muted-foreground">일정 기간 동안 안정적으로 일할 수 있는 공고</p>
              </div>
              <Link href="/jobs">
                <Button variant="ghost" size="sm">
                  전체보기
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              {fixedTermClients.map((client) =>
                client.job_postings.map((job) => (
                  <Link key={job.id} href={`/jobs/${client.id}`}>
                    <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg rounded-[10px]">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-blue-200">
                            {client.main_image_url ? (
                              <img
                                src={client.main_image_url}
                                alt={client.company_name}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Briefcase className="h-7 w-7 text-blue-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-blue-600/20 text-blue-800 border-0 text-[10px] font-semibold">
                                기간제
                              </Badge>
                              {job.title && (
                                <span className="text-xs font-medium text-blue-800 truncate">
                                  {job.title}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold group-hover:text-primary">{client.company_name}</h3>
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
                          <span className="text-sm font-medium text-primary">
                            {formatClientWage(client)}
                          </span>
                          <Badge variant="secondary">{job.headcount}명 모집</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      <section className="bg-[#F9F9F9] px-4 pt-20 pb-48">
        <div className="mx-auto max-w-[1170px]">
        <p className="mb-2 text-center text-base font-semibold uppercase tracking-wider text-indigo-600">Service</p>
        <h2 className="mb-2 text-center text-[35px] font-bold md:text-[43px]">서비스 소개</h2>
        <p className="mb-12 text-center text-[23px] text-muted-foreground">Humend가 제공하는 핵심 서비스</p>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((service) => (
            <Card
              key={service.title}
              className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#001946]/30 hover:shadow-xl"
            >
              <service.icon
                aria-hidden
                className={`pointer-events-none absolute -bottom-5 -right-4 h-32 w-32 transition-all duration-300 group-hover:scale-110 ${service.watermark}`}
              />
              <CardContent className="relative pt-6 pb-[72px]">
                <div className={`mb-11 flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-200 ${service.accent}`}>
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{service.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </section>

      {/* Stats — 사진 패널 3분할, 푸터와 맞닿음 */}
      <section className="footer-flush grid md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative flex min-h-[280px] items-center justify-center overflow-hidden px-6 py-16 text-center"
          >
            <img src={stat.photo} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/75" />
            <div className="relative">
              <stat.icon className="mx-auto mb-4 h-8 w-8 text-white/60" />
              <p className="text-5xl font-bold text-white md:text-6xl">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-3 text-base text-white/70 md:text-lg">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
    </>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateRange, formatWorkDays, formatTime, formatClientWage } from "@/lib/utils/format";
import { Users, Building2, Handshake, ArrowRight, Zap, MapPin, Shield, Briefcase, Search, Calendar, Clock } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import HeroSection from "@/components/home/HeroSection";
import KakaoFloatingButton from "@/components/home/KakaoFloatingButton";

const stats = [
  { label: "등록 회원", value: 12000, suffix: "+", icon: Users, color: "text-blue-500" },
  { label: "제휴 고객사", value: 200, suffix: "+", icon: Building2, color: "text-green-500" },
  { label: "매칭 완료", value: 30000, suffix: "+", icon: Handshake, color: "text-purple-500" },
];

const services = [
  {
    title: "빠른 매칭",
    description: "원하는 날짜에 바로 지원하고, 빠르게 승인받으세요.",
    icon: Zap,
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    title: "다양한 현장",
    description: "웨딩홀, 케이터링, 컨벤션 등 다양한 근무처를 제공합니다.",
    icon: MapPin,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "투명한 급여",
    description: "시급 사전 공개, 근무 후 정확한 급여 정산을 보장합니다.",
    icon: Shield,
    color: "bg-green-500/10 text-green-500",
  },
];

const dailyClients = [
  {
    id: "mock-1",
    company_name: "그랜드 웨딩홀",
    location: "서울 강남구",
    main_image_url: null,
    hourly_wage: 13000,
    wage_type: "시급",
    job_postings: [
      { id: "j1", work_date: "2026-03-25", posting_type: "daily" },
      { id: "j2", work_date: "2026-03-28", posting_type: "daily" },
      { id: "j3", work_date: "2026-04-01", posting_type: "daily" },
    ],
  },
  {
    id: "mock-2",
    company_name: "더파티 케이터링",
    location: "서울 서초구",
    main_image_url: null,
    hourly_wage: 14000,
    wage_type: "시급",
    job_postings: [
      { id: "j4", work_date: "2026-03-22", posting_type: "daily" },
      { id: "j5", work_date: "2026-03-29", posting_type: "daily" },
    ],
  },
  {
    id: "mock-3",
    company_name: "코엑스 컨벤션",
    location: "서울 삼성동",
    main_image_url: null,
    hourly_wage: 12500,
    wage_type: "시급",
    job_postings: [
      { id: "j6", work_date: "2026-03-26", posting_type: "daily" },
    ],
  },
  {
    id: "mock-4",
    company_name: "롯데호텔 연회장",
    location: "서울 중구",
    main_image_url: null,
    hourly_wage: 15000,
    wage_type: "시급",
    job_postings: [
      { id: "j7", work_date: "2026-03-23", posting_type: "daily" },
      { id: "j8", work_date: "2026-03-30", posting_type: "daily" },
    ],
  },
  {
    id: "mock-7",
    company_name: "인터컨티넨탈 호텔",
    location: "서울 강남구",
    main_image_url: null,
    hourly_wage: 14500,
    wage_type: "시급",
    job_postings: [
      { id: "j11", work_date: "2026-03-24", posting_type: "daily" },
      { id: "j12", work_date: "2026-03-31", posting_type: "daily" },
    ],
  },
  {
    id: "mock-8",
    company_name: "노보텔 앰배서더",
    location: "서울 용산구",
    main_image_url: null,
    hourly_wage: 13000,
    wage_type: "시급",
    job_postings: [
      { id: "j13", work_date: "2026-03-27", posting_type: "daily" },
    ],
  },
  {
    id: "mock-9",
    company_name: "파라다이스 시티",
    location: "인천 중구",
    main_image_url: null,
    hourly_wage: 16000,
    wage_type: "시급",
    job_postings: [
      { id: "j14", work_date: "2026-03-25", posting_type: "daily" },
      { id: "j15", work_date: "2026-04-02", posting_type: "daily" },
    ],
  },
  {
    id: "mock-10",
    company_name: "세빛섬 이벤트홀",
    location: "서울 서초구",
    main_image_url: null,
    hourly_wage: 13500,
    wage_type: "시급",
    job_postings: [
      { id: "j16", work_date: "2026-03-22", posting_type: "daily" },
      { id: "j17", work_date: "2026-03-29", posting_type: "daily" },
      { id: "j18", work_date: "2026-04-05", posting_type: "daily" },
    ],
  },
];

const fixedTermClients = [
  {
    id: "mock-5",
    company_name: "서울 컨퍼런스센터",
    location: "서울 영등포구",
    main_image_url: null,
    hourly_wage: 13500,
    wage_type: "시급",
    job_postings: [
      {
        id: "j9",
        title: "전시회 스태프",
        posting_type: "fixed_term" as const,
        start_date: "2026-04-01",
        end_date: "2026-04-15",
        work_days: [1, 2, 3, 4, 5],
        start_time: "09:00",
        end_time: "18:00",
        headcount: 5,
        work_date: null,
      },
    ],
  },
  {
    id: "mock-6",
    company_name: "하얏트 호텔",
    location: "서울 용산구",
    main_image_url: null,
    hourly_wage: 14500,
    wage_type: "시급",
    job_postings: [
      {
        id: "j10",
        title: "연회 서비스 보조",
        posting_type: "fixed_term" as const,
        start_date: "2026-04-05",
        end_date: "2026-05-05",
        work_days: [5, 6, 0],
        start_time: "11:00",
        end_time: "20:00",
        headcount: 3,
        work_date: null,
      },
    ],
  },
];

export default function MockupHome() {
  return (
    <div className="animate-in fade-in duration-500">
      <KakaoFloatingButton />

      {/* Hero */}
      <HeroSection />

      {/* 알바공고 (일별) */}
      <section className="bg-muted/20 px-4 py-20">
        <div className="mx-auto max-w-5xl">
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
          <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
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
        </div>
      </section>

      {/* 기간제 알바 */}
      <section className="px-4 py-20 -mt-[50px]">
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
                  <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg rounded-[10px] border-2 border-violet-200">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-violet-50 to-violet-100">
                          {client.main_image_url ? (
                            <img
                              src={client.main_image_url}
                              alt={client.company_name}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Briefcase className="h-7 w-7 text-violet-400" />
                            </div>
                          )}
                        </div>
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
                            : formatDate(job.work_date ?? "")}
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

      {/* Stats */}
      <section className="border-y px-4 py-12" style={{ backgroundColor: "#FFF8D4" }}>
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold md:text-4xl">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="px-4 py-20" style={{ backgroundColor: "#E17564" }}>
        <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">서비스 소개</h2>
        <p className="mb-12 text-center text-muted-foreground">Humend가 제공하는 핵심 서비스</p>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((service) => (
            <Card key={service.title} className="group transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="pt-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${service.color}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{service.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t text-white" style={{ backgroundColor: "#872341", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            <div>
              <p className="text-lg font-bold">휴멘드 에이치알</p>
              <p className="mt-1 text-base text-white/80">
                인력 매칭 플랫폼
              </p>
              <div className="mt-2 space-y-0.5 text-base text-white/80">
                <p>서울특별시 구로구 디지털로34번길 55, 비201-비2(구로동, 코오롱 싸이언스밸리2차)</p>
                <p>Tel. 02-875-8332 | 사업자등록번호 396-87-03869</p>
              </div>
            </div>
            <nav className="flex gap-6 text-base text-white/80">
              <Link href="/jobs" className="hover:text-white">
                채용공고
              </Link>
              <Link href="/privacy" className="hover:text-white">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="hover:text-white">
                이용약관
              </Link>
            </nav>
          </div>
          <div className="mt-6 border-t border-white/20 pt-4 text-center">
            <p className="text-base font-medium text-white/70">
              Developed by{" "}
              <a href="https://www.bizstart.shop" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Bizstart(비즈스타트)
              </a>
              ,{" "}
              <a href="https://www.bizstart.shop" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                www.bizstart.shop
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

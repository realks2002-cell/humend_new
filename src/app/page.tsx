export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClientsWithJobs } from "@/lib/supabase/queries";
import { formatDate, formatWage } from "@/lib/utils/format";
import { Users, Building2, Handshake, ArrowRight, Zap, MapPin, Shield, Briefcase, Search } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";

const stats = [
  { label: "등록 회원", value: 1200, suffix: "+", icon: Users, color: "text-blue-500" },
  { label: "제휴 고객사", value: 50, suffix: "+", icon: Building2, color: "text-green-500" },
  { label: "매칭 완료", value: 8500, suffix: "+", icon: Handshake, color: "text-purple-500" },
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

export default async function Home() {
  const clientsWithJobs = await getClientsWithJobs();

  return (
    <div className="animate-in fade-in duration-500">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-24 text-center md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,0,0,0.02)_0%,transparent_50%)]" />
        <div className="relative">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            지금 가입하면 바로 지원 가능
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            당신의 일자리,
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Humend HR
            </span>
            이 연결합니다
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground md:text-xl">
            웨딩홀, 케이터링, 컨벤션 등 다양한 현장에서
            <br />
            원하는 날짜에 일하세요.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/jobs">
              <Button size="lg" className="h-12 px-8 text-base">
                채용공고 보기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                회원가입
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Jobs Preview */}
      <section className="bg-muted/20 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">최근 채용공고</h2>
              <p className="mt-1 text-muted-foreground">지금 바로 지원할 수 있는 공고</p>
            </div>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">
                전체보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {clientsWithJobs.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent>
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">
                  현재 등록된 채용공고가 없습니다
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  새로운 공고가 등록되면 여기에 표시됩니다
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
              {clientsWithJobs.map((client) => (
                <Link key={client.id} href={`/jobs/${client.id}`}>
                  <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
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
                    <CardContent className="pt-4">
                      <h3 className="font-semibold group-hover:text-primary">{client.company_name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {client.location}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          시급 {formatWage(client.hourly_wage)}
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

      {/* Stats */}
      <section className="border-y bg-muted/30 px-4 py-12">
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
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">서비스 소개</h2>
        <p className="mb-12 text-center text-muted-foreground">Humend HR이 제공하는 핵심 서비스</p>
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
    </div>
  );
}

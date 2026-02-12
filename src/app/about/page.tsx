import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, CheckCircle, Banknote, ArrowRight, Zap, Heart, Smartphone } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    icon: ClipboardList,
    title: "공고 등록",
    description: "고객사 정보와 근무 일정을 등록합니다.",
    color: "bg-blue-500/10 text-blue-500",
    step: "01",
  },
  {
    icon: Users,
    title: "인력 매칭",
    description: "등록된 인력 중 적합한 인원을 매칭합니다.",
    color: "bg-green-500/10 text-green-500",
    step: "02",
  },
  {
    icon: CheckCircle,
    title: "근무 확인",
    description: "매칭된 인력이 현장에서 근무합니다.",
    color: "bg-orange-500/10 text-orange-500",
    step: "03",
  },
  {
    icon: Banknote,
    title: "급여 정산",
    description: "근무 완료 후 투명하게 급여를 정산합니다.",
    color: "bg-purple-500/10 text-purple-500",
    step: "04",
  },
];

const values = [
  {
    icon: Zap,
    title: "신속",
    description: "당일 매칭도 가능한 빠른 인력 공급",
    color: "text-orange-500",
  },
  {
    icon: Heart,
    title: "신뢰",
    description: "검증된 인력과 투명한 급여 관리",
    color: "text-red-500",
  },
  {
    icon: Smartphone,
    title: "편의",
    description: "모바일 지원으로 어디서든 간편하게",
    color: "text-blue-500",
  },
];

export default function AboutPage() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Vision */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-20 text-center md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(0,0,0,0.02)_0%,transparent_50%)]" />
        <div className="relative">
          <h1 className="text-3xl font-bold md:text-5xl">
            사람과 현장을 연결하는
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">파트너</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
            Humend HR은 웨딩홀, 케이터링, 컨벤션 등 행사 현장에
            <br />
            필요한 인력을 빠르고 정확하게 매칭하는 플랫폼입니다.
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">서비스 프로세스</h2>
        <p className="mb-12 text-center text-muted-foreground">4단계로 간편하게 진행됩니다</p>
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-12 hidden h-0.5 w-6 translate-x-3 bg-border md:block" />
              )}
              <Card className="group text-center transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="pt-6">
                  <span className="mb-2 block text-xs font-bold text-muted-foreground/50">{step.step}</span>
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${step.color} transition-transform group-hover:scale-110`}>
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/20 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold md:text-3xl">핵심 가치</h2>
          <p className="mb-12 text-center text-muted-foreground">Humend HR이 추구하는 가치</p>
          <div className="grid gap-8 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-sm">
                  <v.icon className={`h-8 w-8 ${v.color}`} />
                </div>
                <p className="text-2xl font-bold">{v.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">지금 시작하세요</h2>
        <p className="mt-3 text-lg text-muted-foreground">
          회원가입 후 바로 채용공고에 지원할 수 있습니다.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="h-12 px-8 text-base">
              회원가입
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/jobs">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              채용공고 보기
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

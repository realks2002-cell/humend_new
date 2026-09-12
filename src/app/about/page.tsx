"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardList, Users, CheckCircle, Banknote, Zap, Heart, Smartphone, CheckCircle2, Loader2, CornerDownRight } from "lucide-react";
import { submitPartnerInquiry } from "./actions";

const steps = [
  {
    icon: ClipboardList,
    title: "공고 등록",
    accent: "bg-sky-500/10 text-sky-600 group-hover:bg-sky-500 group-hover:text-white",
    description: "고객사 정보와 근무 일정을 등록합니다.",
    color: "bg-gray-100 text-gray-700",
    step: "01",
  },
  {
    icon: Users,
    title: "인력 매칭",
    accent: "bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white",
    description: "등록된 인력 중 적합한 인원을 매칭합니다.",
    color: "bg-gray-100 text-gray-700",
    step: "02",
  },
  {
    icon: CheckCircle,
    title: "근무 확인",
    accent: "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white",
    description: "매칭된 인력이 현장에서 근무합니다.",
    color: "bg-gray-100 text-gray-700",
    step: "03",
  },
  {
    icon: Banknote,
    title: "급여 정산",
    accent: "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
    description: "근무 완료 후 투명하게 급여를 정산합니다.",
    color: "bg-gray-100 text-gray-700",
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

const FIELD_CLASS =
  "h-14 rounded-none border-0 border-b border-white/25 bg-transparent px-0 text-xl text-white shadow-none placeholder:text-white/30 focus-visible:border-white focus-visible:ring-0 md:text-xl";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function AboutPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    try {
      const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
      setIsNative(!!w.Capacitor?.isNativePlatform?.());
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await submitPartnerInquiry(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
      setPhone("");
    }
  }

  return (
    <div className={`animate-in fade-in duration-500 ${isNative ? "" : "footer-flush"}`}>
      {/* Vision */}
      <section
        className={`relative overflow-hidden px-4 text-center ${isNative ? "py-20 md:py-28 bg-gradient-to-br from-primary/5 via-background to-primary/10" : "pt-36 pb-40 md:pt-48 md:pb-56 bg-black text-white"}`}
      >
        {!isNative && (
          <>
            <img src="/images/about-hero.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/82" />
          </>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(0,0,0,0.02)_0%,transparent_50%)]" />
        {!isNative && (
          <svg aria-hidden viewBox="0 0 1440 64" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full md:h-20">
            <path d="M0 64V54Q720-26 1440 54V64Z" className="fill-background" />
          </svg>
        )}
        <div className="relative" style={{ marginTop: "30px" }}>
          <h1 className={`font-bold ${isNative ? "text-3xl md:text-5xl" : "text-[44px] md:text-[72px]"}`}>
            사람과 현장을 연결하는
            <br />
            {isNative ? (
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">파트너</span>
            ) : (
              <span className="text-indigo-300">파트너</span>
            )}
          </h1>
          <p className={`mx-auto mt-6 break-keep ${isNative ? "hidden max-w-lg text-lg" : "max-w-2xl text-2xl text-[rgb(162,170,190)]"}`}>
            Humend HR은 웨딩홀, 케이터링, 컨벤션 등 행사 현장에
            <br />
            필요한 인력을 빠르고 정확하게 매칭하는 플랫폼입니다.
          </p>
        </div>
      </section>

      {/* Process */}
      <section className={`mx-auto px-4 py-20 ${isNative ? "" : "max-w-[1092px]"}`}>
        {!isNative && <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-indigo-600">Process</p>}
        <h2 className="mb-2 text-center text-3xl font-bold md:text-4xl">서비스 프로세스</h2>
        <p className="mb-12 text-center text-xl text-muted-foreground">4단계로 간편하게 진행됩니다</p>
        {isNative ? (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {steps.map((step) => (
              <Card key={step.title} className="min-w-[70vw] shrink-0 snap-center text-center">
                <CardContent className="pt-6">
                  <span className="mb-2 block text-xs font-bold text-muted-foreground/50">{step.step}</span>
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${step.color}`}>
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.title} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-12 hidden h-0.5 w-6 translate-x-3 bg-border md:block" />
                )}
                <Card className="group text-center transition-all hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="pt-6 pb-[53px]">
                    <span className="mb-2 block text-sm font-bold text-muted-foreground/50">{step.step}</span>
                    <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${step.accent} transition-all duration-200 group-hover:scale-110`}>
                      <step.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Values */}
      <section className={`px-4 py-20 ${isNative ? "bg-muted/20" : "bg-[color-mix(in_oklch,#001946_4%,white)]"}`}>
        <div className="mx-auto max-w-4xl">
          {!isNative && <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-indigo-600">Values</p>}
          <h2 className={`mb-2 text-center font-bold ${isNative ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}>핵심 가치</h2>
          <p className={`mb-12 text-center text-muted-foreground ${isNative ? "" : "text-xl"}`}>Humend HR이 추구하는 가치</p>
          <div className="grid grid-cols-3 gap-4">
            {values.map((v) => (
              <div key={v.title} className="text-center">
                <div className={`mx-auto mb-3 flex items-center justify-center rounded-full bg-background shadow-sm ${isNative ? "h-12 w-12 md:h-16 md:w-16" : "h-14 w-14 md:h-20 md:w-20"}`}>
                  <v.icon className={`${isNative ? "h-6 w-6 md:h-8 md:w-8" : "h-7 w-7 md:h-10 md:w-10"} ${v.color}`} />
                </div>
                <p className={`font-bold ${isNative ? "text-lg md:text-2xl" : "text-xl md:text-3xl"}`}>{v.title}</p>
                <p className={`mt-1 text-muted-foreground md:mt-2 ${isNative ? "hidden text-xs md:text-sm" : "text-sm md:text-base"}`}>
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Inquiry Form */}
      <section className={`relative overflow-hidden bg-black px-4 py-12 text-white md:py-16 ${isNative ? "hidden" : ""}`}>
        <img src="/contact-bg.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/25" />

        <div className="relative mx-auto max-w-[1229px]">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Contact</p>
          <h2 className="mt-4 text-[38px] font-black leading-[1.1] tracking-tight md:text-[64px]">
            인력이 필요한
            <br />
            현장이 있나요?
          </h2>

          <div className="mt-10 grid gap-10 md:mt-10 md:grid-cols-2 md:gap-16">
            {/* 좌측 — 안내 + 연락처 */}
            <div>
              <p className="max-w-md break-keep text-lg leading-relaxed text-white/70">
                구체적인 계획이 없어도 괜찮습니다. 필요한 인원과 일정을 듣고,
                현장에 맞는 인력 운영 방안을 정리해 제안드립니다.
              </p>

              <dl className="mt-12 space-y-8">
                <div>
                  <dt className="text-sm font-semibold text-indigo-300">전화</dt>
                  <dd className="mt-2 text-lg text-white/85">
                    <a href="tel:028758332" className="transition-colors hover:text-white">02-875-8332</a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-indigo-300">이메일</dt>
                  <dd className="mt-2 text-lg text-white/85">
                    <a href="mailto:support@humendhr.com" className="transition-colors hover:text-white">support@humendhr.com</a>
                  </dd>
                </div>
              </dl>

              <a
                href="https://pf.kakao.com/_sPCKb/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-12 inline-flex h-14 items-center justify-center rounded-[5px] bg-[#FEE500] px-10 text-lg font-bold text-[#3C1E1E] transition-transform duration-150 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                카톡 상담하기
              </a>
            </div>

            {/* 우측 — 문의 폼 */}
            <div className="md:-mt-[200px]">
              {submitted ? (
                <div className="flex flex-col items-start gap-3 border border-white/20 bg-white/5 p-8">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                  <p className="text-xl font-semibold">문의가 접수되었습니다</p>
                  <p className="text-base text-white/70">담당자가 확인 후 빠르게 연락드리겠습니다.</p>
                  <Button
                    variant="outline"
                    className="mt-4 border-white/30 bg-transparent text-white hover:bg-white hover:text-black"
                    onClick={() => setSubmitted(false)}
                  >
                    추가 문의하기
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-lg font-normal text-white" htmlFor="company_name">
                      회사명(Company) <span className="text-indigo-300">*</span>
                    </Label>
                    <Input
                      className={FIELD_CLASS}
                      id="company_name"
                      name="company_name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-normal text-white" htmlFor="contact_person">
                      담당자명(Name) <span className="text-indigo-300">*</span>
                    </Label>
                    <Input
                      className={FIELD_CLASS}
                      id="contact_person"
                      name="contact_person"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-normal text-white" htmlFor="contact_phone">
                      연락처(Phone) <span className="text-indigo-300">*</span>
                    </Label>
                    <Input
                      className={FIELD_CLASS}
                      id="contact_phone"
                      name="contact_phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="010-0000-0000"
                      maxLength={13}
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-normal text-white" htmlFor="contact_email">
                      이메일(E-mail)
                    </Label>
                    <Input
                      className={FIELD_CLASS}
                      id="contact_email"
                      name="contact_email"
                      type="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-normal text-white" htmlFor="message">
                      어떤 인력이 필요하신가요?
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={3}
                      className={`${FIELD_CLASS} min-h-24 resize-none py-2`}
                    />
                  </div>

                  {error && <p className="text-base text-red-400">{error}</p>}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group inline-flex items-center gap-2 py-2 text-lg font-medium text-white transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          제출 중...
                        </>
                      ) : (
                        <>
                          <CornerDownRight className="h-5 w-5 text-indigo-300" />
                          문의하기
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const COLORS = {
  background: "#001946",
  textPrimary: "#FFFFFF",
  textSecondary: "rgb(162, 170, 190)",
  textMuted: "rgb(148, 163, 184)",
  quote: "rgb(212, 212, 216)",
  border: "rgba(255, 255, 255, 0.85)",
} as const;

const TESTIMONIALS = [
  {
    quote:
      "\"처음 해보는 알바라 걱정했는데, 현장 위치랑 시급이 미리 다 나와 있어서 편했어요. 지원하고 다음 날 바로 출근했어요.\"",
    name: "김지윤",
    meta: "웨딩홀 서빙 · 6개월차",
    avatar: "https://images.unsplash.com/photo-1715243759229-1c18eba0c449?w=200&h=200&fit=crop&crop=faces",
  },
  {
    quote:
      "\"주말마다 원하는 날짜만 골라서 일할 수 있는 게 제일 좋아요. 급여도 근무 끝나면 정확하게 들어와서 믿고 계속 쓰고 있어요.\"",
    name: "박도현",
    meta: "케이터링 보조 · 1년차",
    avatar: "https://images.unsplash.com/photo-1626788215369-3ba6c6ae88c0?w=200&h=200&fit=crop&crop=faces",
  },
  {
    quote:
      "\"행사 인력이 급하게 필요할 때 휴멘드에 요청하면 하루 안에 배정돼요. 출근 확인까지 앱으로 되니 현장 관리가 훨씬 수월해졌습니다.\"",
    name: "이서준",
    meta: "컨벤션센터 운영팀장",
    avatar: "https://images.unsplash.com/photo-1568437126185-c53def906598?w=200&h=200&fit=crop&crop=faces",
  },
  {
    quote:
      "\"기간제로 3개월 일했는데 근무표랑 급여명세를 앱에서 바로 볼 수 있어서 따로 물어볼 일이 없었어요.\"",
    name: "최하은",
    meta: "물류 계약직 · 기간제",
    avatar: "https://images.unsplash.com/photo-1773899337978-b8d83bd9b783?w=200&h=200&fit=crop&crop=faces",
  },
  {
    quote:
      "\"호텔 연회 성수기에 매주 30명 넘게 받는데, 한 번 온 분들이 다시 오는 비율이 높아서 교육 부담이 줄었어요.\"",
    name: "정민아",
    meta: "호텔 연회부 매니저",
    avatar: "https://images.unsplash.com/photo-1679801823749-ddcc06fb6a98?w=200&h=200&fit=crop&crop=faces",
  },
];

const MARQUEE_CHIPS = [
  { label: "케이터링 보조", color: "#38BDF8" },
  { label: "연회장 세팅", color: "#A855F7" },
  { label: "호텔 연회", color: "#F472B6" },
  { label: "웨딩홀 서빙", color: "#818CF8" },
  { label: "생산 계약직", color: "#F59E0B" },
  { label: "물류 계약직", color: "#10B981" },
  { label: "사무 계약직", color: "#6366F1" },
  { label: "팝업행사", color: "#EC4899" },
  { label: "이벤트 스탭", color: "#14B8A6" },
  { label: "공연 스탭", color: "#8B5CF6" },
];

const AUTO_ROTATE_MS = 5000;

export default function HeroStatsSection() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleSalaryRequest = () => {
    router.push(user ? "/my/salary" : "/login?redirect=/my/salary");
  };

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [next, paused, activeIndex]);

  const active = TESTIMONIALS[activeIndex];

  return (
    <>
    <section
      className="relative w-full overflow-hidden pt-32 pb-28"
      style={{ backgroundColor: COLORS.background }}
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          {/* Left: Headline + CTA */}
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              오늘도 새로운 알바가 널 기다리는 중
            </span>
            <h1
              className="text-[40px] font-bold leading-[1.15] tracking-[-0.04em] sm:text-[50px] lg:text-[58px]"
              style={{ color: COLORS.textPrimary }}
            >
              일할 준비 됐으면,
              <br />
              <span className="text-indigo-300">탭 한 번</span>이면 끝.
            </h1>
            <p className="mt-4 text-xl font-semibold md:text-[25px]" style={{ color: COLORS.textSecondary }}>
              오늘 지원하고, 내일 출근하자.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSalaryRequest}
                className="inline-flex items-center gap-2 rounded-[5px] bg-white px-6 py-3 text-base font-semibold text-[#001946] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001946]"
              >
                회원 급여요청
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/jobs"
                className="inline-flex items-center rounded-[5px] border border-white/25 px-6 py-3 text-base font-semibold text-white transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001946]"
              >
                어떤 알바가 있을까?
              </Link>
            </div>
          </div>

          {/* Right: Testimonial Carousel */}
          <div
            className="flex max-w-[520px] flex-col animate-in fade-in slide-in-from-bottom-2 delay-100 duration-500 fill-mode-both motion-reduce:animate-none lg:pt-4"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="relative min-h-[120px] lg:min-h-[96px]" aria-live="polite">
              <p
                key={activeIndex}
                className="break-keep text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none md:text-xl lg:text-[20px] lg:leading-[1.6]"
                style={{ color: COLORS.quote }}
              >
                {active.quote}
              </p>
            </div>

            <div
              key={`meta-${activeIndex}`}
              className="mt-4 animate-in fade-in duration-300 motion-reduce:animate-none"
            >
              <p className="text-base font-semibold text-white">{active.name}</p>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                {active.meta}
              </p>
            </div>

            <div className="mt-6 flex -space-x-3">
              {TESTIMONIALS.map((t, index) => {
                const isActive = activeIndex === index;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`${t.name} 후기 보기`}
                    aria-pressed={isActive}
                    className="relative h-12 w-12 overflow-hidden rounded-full transition-[transform,opacity,filter] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001946] md:h-14 md:w-14"
                    style={{
                      backgroundColor: COLORS.background,
                      boxShadow: `0 0 0 ${isActive ? 2 : 1}px ${COLORS.border}`,
                      zIndex: isActive ? TESTIMONIALS.length + 1 : TESTIMONIALS.length - index,
                      opacity: isActive ? 1 : 0.55,
                      filter: isActive ? "brightness(1)" : "brightness(0.6)",
                    }}
                  >
                    <img src={t.avatar} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-sm leading-relaxed md:text-base" style={{ color: COLORS.textMuted }}>
              쉬운 지원, <strong className="text-white">확실한 급여</strong>.
              <br />
              첫 알바도 걱정 없어.
            </p>
          </div>
        </div>
      </div>
    </section>

    <div className="w-full overflow-hidden border-b border-gray-200 bg-white py-4">
      <div className="flex hover:[&>*]:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 gap-4 pr-4 motion-reduce:!animate-none"
            style={{ animation: "hero-marquee-scroll 20s linear infinite" }}
          >
            {MARQUEE_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 whitespace-nowrap px-5 py-2.5 text-sm font-semibold text-black transition-colors duration-150 hover:text-indigo-600"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: chip.color }} />
                {chip.label}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

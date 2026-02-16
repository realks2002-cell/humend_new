"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const marqueeChips = [
  { label: "케이터링 보조", color: "#38BDF8" },
  { label: "연회장 세팅", color: "#A855F7" },
  { label: "호텔 연회", color: "#F472B6" },
  { label: "웨딩홀 서빙", color: "#4F46E5" },
  { label: "생산 계약직", color: "#F59E0B" },
  { label: "물류 계약직", color: "#10B981" },
  { label: "사무 계약직", color: "#6366F1" },
  { label: "팝업행사", color: "#EC4899" },
  { label: "이벤트 스탭", color: "#14B8A6" },
  { label: "공연 스탭", color: "#8B5CF6" },
];

function makeCharsHTML(text: string, baseDelay: number): string {
  let html = "";
  let idx = 0;
  for (const char of text) {
    const delay = baseDelay + idx * 40;
    if (char === " ") {
      html += `<span class="hero-char hero-char-space" style="animation-delay:${delay}ms">&nbsp;</span>`;
    } else {
      html += `<span class="hero-char" style="animation-delay:${delay}ms">${char}</span>`;
    }
    idx++;
  }
  return html;
}

export default function HeroSection() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleSalaryRequest = () => {
    if (user) {
      router.push("/my/salary");
    } else {
      router.push("/login?redirect=/my/salary");
    }
  };

  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const badgeTextRef = useRef<HTMLSpanElement>(null);
  const counter1Ref = useRef<HTMLSpanElement>(null);
  const counter2Ref = useRef<HTMLSpanElement>(null);
  const counter3Ref = useRef<HTMLSpanElement>(null);

  const animateCounter = useCallback(
    (el: HTMLSpanElement, target: number, decimals: number, duration: number) => {
      const startTime = performance.now();
      function update(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = target * ease;
        el.textContent = decimals > 0 ? current.toFixed(decimals) : String(Math.round(current));
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    },
    []
  );

  useEffect(() => {
    // Character-by-character headline
    if (line1Ref.current) {
      line1Ref.current.innerHTML = makeCharsHTML("일할 준비 됐으면,", 500);
    }
    if (line2Ref.current) {
      line2Ref.current.innerHTML =
        '<span class="hero-highlight"><span class="hero-accent-primary">' +
        makeCharsHTML("탭 한 번", 900) +
        "</span></span>" +
        makeCharsHTML("이면 끝.", 900 + 4 * 40);
    }

    // Word-by-word description
    if (descRef.current) {
      const words = "쉬운 지원, 확실한 급여. 첫 알바도 걱정 없어.".split(" ");
      descRef.current.innerHTML = words
        .map((word, i) => {
          const delay = 2000 + i * 120;
          return `<span class="hero-desc-word" style="animation-delay:${delay}ms">${word}</span> `;
        })
        .join("");
    }

    // Badge cursor removal
    const cursorTimer = setTimeout(() => {
      badgeTextRef.current?.classList.add("done");
    }, 2000);

    // Counter animation
    const counterTimer = setTimeout(() => {
      if (counter1Ref.current) animateCounter(counter1Ref.current, 98, 0, 1200);
      if (counter2Ref.current) animateCounter(counter2Ref.current, 4.8, 1, 1200);
      if (counter3Ref.current) animateCounter(counter3Ref.current, 30, 0, 1000);
    }, 3000);

    return () => {
      clearTimeout(cursorTimer);
      clearTimeout(counterTimer);
    };
  }, [animateCounter]);

  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-10 text-center"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(129,140,248,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(56,189,248,0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 10% 60%, rgba(251,191,36,0.06) 0%, transparent 50%), #FAFBFF",
      }}
    >
      {/* Grid pattern */}
      <div className="hero-grid-pattern pointer-events-none absolute inset-0" />

      {/* Gradient blobs */}
      <div
        className="absolute -top-20 right-[10%] h-[400px] w-[400px] rounded-full opacity-50 blur-[80px]"
        style={{
          background: "linear-gradient(135deg, #c7d2fe, #a5b4fc)",
          animation: "hero-blob-float 10s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -left-[5%] bottom-[5%] h-[350px] w-[350px] rounded-full opacity-30 blur-[80px]"
        style={{
          background: "linear-gradient(135deg, #fde68a, #fbbf24)",
          animation: "hero-blob-float 10s ease-in-out infinite -3s",
        }}
      />
      <div
        className="absolute -right-[5%] top-[40%] h-[300px] w-[300px] rounded-full opacity-30 blur-[80px]"
        style={{
          background: "linear-gradient(135deg, #99f6e4, #5eead4)",
          animation: "hero-blob-float 10s ease-in-out infinite -6s",
        }}
      />

      {/* Hero content */}
      <div className="relative z-[2] max-w-[900px]">
        {/* Badge with typing effect */}
        <div
          className="hero-badge mb-10 inline-flex items-center gap-2 rounded-full border border-indigo-600/12 bg-white px-5 py-2 text-sm font-semibold text-indigo-600 shadow-sm"
          style={{ animation: "hero-badge-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both 0.2s" }}
        >
          <span
            className="h-2 w-2 rounded-full bg-green-500"
            style={{ animation: "hero-pulse-dot 2s ease-in-out infinite" }}
          />
          <span ref={badgeTextRef} className="hero-badge-text">
            오늘도 새로운 알바가 널 기다리는 중
          </span>
        </div>

        {/* Headline - per-character animation */}
        <h1
          className="hero-headline mb-5 text-[clamp(2.6rem,6.5vw,5rem)] font-black leading-[1.2] text-indigo-950"
          style={{ letterSpacing: "-2px" }}
        >
          <span className="block overflow-hidden" ref={line1Ref} />
          <span className="block overflow-hidden" ref={line2Ref} />
        </h1>

        {/* Subheadline - slide up */}
        <p
          className="hero-subheadline mb-4 text-xl font-bold text-gray-600 md:text-2xl"
          style={{ opacity: 0, transform: "translateY(20px)", animation: "hero-slide-up 0.7s ease-out forwards 1.8s" }}
        >
          오늘 지원하고, 내일 출근하자.
        </p>

        {/* Description - word-by-word */}
        <p
          ref={descRef}
          className="mx-auto mb-11 max-w-[520px] text-base leading-relaxed text-gray-400"
        />

        {/* CTA - bounce in */}
        <div
          className="flex flex-wrap justify-center gap-3.5"
          style={{ opacity: 0, transform: "translateY(20px)", animation: "hero-cta-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 2.8s" }}
        >
          <button
            onClick={handleSalaryRequest}
            className="hero-cta-primary rounded-2xl px-11 py-4.5 text-lg font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, #4F46E5, #6366F1, #818CF8)",
              boxShadow: "0 4px 20px rgba(79,70,229,0.3)",
            }}
          >
            회원 급여요청 →
          </button>
          <Link href="/jobs">
            <button className="rounded-2xl border-[1.5px] border-indigo-600/15 bg-white px-11 py-4.5 text-lg font-bold text-indigo-950 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-600 hover:bg-indigo-600/3 hover:shadow-lg">
              어떤 알바가 있을까?
            </button>
          </Link>
        </div>

        {/* Stats - staggered slide-up + counter */}
        <div className="mt-12 hidden flex-wrap justify-center overflow-hidden rounded-[14px] border border-indigo-600/8 bg-white shadow-md md:flex">
          {[
            { ref: counter1Ref, suffix: "%", label: "급여 정시 지급률", delay: "3s" },
            { ref: counter2Ref, suffix: "★", label: "알바생 만족도", delay: "3.15s" },
            { ref: counter3Ref, suffix: "초", label: "평균 매칭 시간", delay: "3.3s" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="hero-stat group relative min-w-[120px] flex-1 px-5 py-4.5 text-center md:px-7"
              style={{ opacity: 0, transform: "translateY(20px)", animation: `hero-slide-up 0.6s ease-out forwards ${stat.delay}` }}
            >
              {i > 0 && (
                <div className="absolute bottom-[20%] left-0 top-[20%] w-px bg-indigo-600/8" />
              )}
              <div className="text-2xl font-extrabold tracking-tight text-indigo-950 group-hover:animate-[hero-wiggle_0.5s_ease-in-out]">
                <span ref={stat.ref}>0</span>
                <span className="text-indigo-600">{stat.suffix}</span>
              </div>
              <div className="mt-1 text-[0.7rem] font-semibold text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee - hover pause, seamless infinite loop */}
      <div
        className="relative z-[2] mt-12 w-full overflow-hidden py-4"
        style={{ opacity: 0, animation: "hero-slide-up 0.6s ease-out forwards 3.4s" }}
      >
        <div className="flex hover:[animation-play-state:paused] [&>*]:hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 gap-4 pr-4"
              style={{ animation: "hero-marquee-scroll 20s linear infinite" }}
            >
              {marqueeChips.map((chip, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-indigo-600/8 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition-all duration-300 hover:scale-105 hover:border-indigo-600 hover:text-indigo-600"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: chip.color }}
                  />
                  {chip.label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

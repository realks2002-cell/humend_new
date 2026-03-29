"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  MapPin,
  Users,
  Zap,
  Building2,
  WalletCards,
  Star,
  BadgeCheck,
  Award,
  Phone,
  Briefcase,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getClientsWithJobs } from "@/lib/native-api/queries";
import type { ClientWithJobs } from "@/lib/native-api/queries";
import { formatDate, formatTime, formatClientWage } from "@/lib/utils/format";

export default function MobileHome() {
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [clients, setClients] = useState<ClientWithJobs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    getClientsWithJobs()
      .then(setClients)
      .finally(() => setLoading(false));
  }, []);

  const handleSalaryRequest = () => {
    router.push(user ? "/my/salary" : "/login");
  };

  const dailyClients = clients
    .map((c) => ({
      ...c,
      job_postings: c.job_postings.filter((j) => j.posting_type !== "fixed_term"),
    }))
    .filter((c) => c.job_postings.length > 0);

  const CardIcons = [Star, BadgeCheck, Award];

  return (
    <div className="bg-hd-background text-hd-on-surface">
      <main className="pt-18 pb-8">
        {/* Hero Section */}
        <section className="relative px-6 pt-4 pb-16 overflow-hidden bg-hd-background">
          <div className="relative z-10">
            <span className="inline-block bg-hd-primary-container/10 text-hd-primary px-3 py-1 rounded-full text-xs font-bold mb-4 tracking-wider uppercase">
              Quick Staffing
            </span>
            <h2 className="text-4xl font-extrabold font-sans leading-tight tracking-tight mb-3">
              일할 준비 됐으면,
              <br />
              <span className="text-hd-primary">탭 한 번</span>이면 끝.
            </h2>
            <p className="text-base text-hd-on-surface-variant mb-8">
              오늘 지원하고, 내일 출근하자.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/jobs">
                <button className="w-full bg-gradient-to-r from-hd-primary to-hd-primary-container text-hd-on-primary py-4 rounded-xl font-bold shadow-lg shadow-hd-primary/20 flex justify-center items-center gap-2">
                  일자리 보기 <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <button
                onClick={handleSalaryRequest}
                className="w-full bg-hd-surface-container-lowest text-hd-primary border border-hd-outline-variant/20 py-4 rounded-xl font-bold flex justify-center items-center gap-2"
              >
                급여 신청 <WalletCards className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-hd-primary/5 rounded-full blur-3xl" />

          {/* Marquee Ticker */}
          <div className="relative z-10 mt-10 w-full overflow-hidden border-y border-gray-200 py-3">
            <div className="flex animate-[marquee-scroll_20s_linear_infinite]">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 gap-4 pr-4">
                  {[
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
                  ].map((chip, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-semibold text-gray-600"
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

        {/* Job List Section */}
        <section className="mb-16">
          <div className="px-6 flex justify-between items-end mb-6">
            <div>
              <h3 className="text-lg font-extrabold font-sans mb-1">
                지금 바로 지원 가능한 공고
              </h3>
              <p className="text-sm text-hd-on-surface-variant">
                내일 바로 일을 시작해보세요
              </p>
            </div>
            <Link href="/jobs" className="text-hd-primary font-bold text-sm whitespace-nowrap shrink-0">
              전체보기
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-hd-primary border-t-transparent" />
            </div>
          ) : dailyClients.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Search className="mx-auto mb-2 h-10 w-10 text-hd-on-surface-variant/30" />
              <p className="text-sm text-hd-on-surface-variant">
                현재 등록된 공고가 없습니다
              </p>
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-6 px-6">
              {dailyClients.slice(0, 6).map((client, idx) => {
                const firstJob = client.job_postings[0];
                const IconComp = CardIcons[idx % 3];
                const today = new Date().toISOString().slice(0, 10);
                const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                const isUrgent = firstJob && (firstJob.work_date === today || firstJob.work_date === tomorrow);
                return (
                  <Link
                    key={client.id}
                    href={`/jobs/detail?client=${client.id}`}
                    className="flex-none w-72"
                  >
                    <div className="relative rounded-2xl overflow-hidden aspect-[3/2] mb-4 group">
                      {client.main_image_url ? (
                        <img
                          src={client.main_image_url}
                          alt={client.company_name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-hd-surface-container flex items-center justify-center">
                          <Briefcase className="h-10 w-10 text-hd-on-surface-variant/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="bg-hd-primary/90 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter">
                          {isUrgent ? "URGENT" : "NEW"}
                        </span>
                        <span className="bg-hd-secondary/90 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                          시급제
                        </span>
                      </div>
                    </div>
                    <div className="bg-hd-surface-container-lowest p-4 rounded-xl -mt-8 relative mx-3 shadow-lg shadow-hd-on-surface/5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-hd-on-surface text-lg line-clamp-1">
                          {client.company_name}
                        </h4>
                        <IconComp
                          className="h-5 w-5 text-hd-primary shrink-0"
                          fill={idx === 0 ? "currentColor" : "none"}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-hd-on-surface-variant mb-3">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {client.location}
                        <span className="mx-1 opacity-30">•</span>
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {firstJob?.headcount || client.job_postings.length}명 모집
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-hd-surface-container">
                        <span className="text-hd-primary font-extrabold text-base whitespace-nowrap">
                          {formatClientWage(client)}
                        </span>
                        {firstJob && (
                          <span className="text-[10px] text-hd-on-surface-variant font-medium">
                            {formatDate(firstJob.work_date)}{" "}
                            {formatTime(firstJob.start_time)}-{formatTime(firstJob.end_time)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Service Intro / Why Human:D */}
        <section className="bg-hd-surface-container-low py-16 px-6">
          <div>
            <h3 className="text-2xl font-extrabold font-sans mb-10 text-center italic">
              Professional Reliability
            </h3>
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-hd-primary/10 flex items-center justify-center shrink-0 text-hd-primary">
                  <Zap className="h-6 w-6" fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">빠른 매칭</h4>
                  <p className="text-hd-on-surface-variant text-sm leading-relaxed">
                    지원 후 최대 1시간 내에 확정. 기다림 없이 내일 바로 일을 시작할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-hd-primary/10 flex items-center justify-center shrink-0 text-hd-primary">
                  <Building2 className="h-6 w-6" fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">다양한 현장</h4>
                  <p className="text-hd-on-surface-variant text-sm leading-relaxed">
                    5성급 호텔부터 대형 웨딩홀까지, 커리어가 되는 프리미엄 현장을 경험하세요.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-hd-primary/10 flex items-center justify-center shrink-0 text-hd-primary">
                  <Wallet className="h-6 w-6" fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">투명한 급여</h4>
                  <p className="text-hd-on-surface-variant text-sm leading-relaxed">
                    근무 종료 즉시 정산 신청 가능. 복잡한 절차 없이 당신의 땀방울을 보상받으세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators Bento Grid */}
        <section className="bg-hd-background py-16 px-6">
          <h3 className="text-xl font-bold font-sans mb-8 text-center text-hd-on-surface-variant">
            숫자로 증명하는 신뢰
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-hd-primary text-hd-on-primary p-8 rounded-[2rem] text-center shadow-xl shadow-hd-primary/10">
              <div className="text-4xl font-black font-sans mb-2 tracking-tighter">
                12,000+
              </div>
              <div className="text-sm opacity-80 font-medium">누적 회원수</div>
            </div>
            <div className="bg-hd-surface-container-lowest p-6 rounded-3xl text-center border border-hd-surface-container">
              <div className="text-2xl font-black font-sans mb-1 text-hd-primary">
                200+
              </div>
              <div className="text-[10px] text-hd-on-surface-variant font-bold uppercase tracking-widest">
                Partners
              </div>
            </div>
            <div className="bg-hd-surface-container-lowest p-6 rounded-3xl text-center border border-hd-surface-container">
              <div className="text-2xl font-black font-sans mb-1 text-hd-primary">
                200k+
              </div>
              <div className="text-[10px] text-hd-on-surface-variant font-bold uppercase tracking-widest">
                Matchings
              </div>
            </div>
          </div>
        </section>

        {/* Partner Section */}
        <section className="px-6 py-12 mb-8">
          <div className="relative bg-hd-inverse-surface text-hd-inverse-on-surface rounded-[2.5rem] p-10 overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold font-sans mb-4 leading-tight">
                인력이 필요한 사장님을
                <br />
                위한 맞춤 솔루션
              </h3>
              <p className="text-sm opacity-70 mb-8 max-w-[200px]">
                급한 인력 충원부터 장기 운영 대행까지 휴먼드가 책임집니다.
              </p>
              <a
                href="tel:02-875-8332"
                className="bg-hd-primary px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 w-fit text-white"
              >
                제휴 문의 <Phone className="h-4 w-4" />
              </a>
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-hd-primary/20 rounded-full blur-2xl" />
          </div>
        </section>
      </main>

    </div>
  );
}

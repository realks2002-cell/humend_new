export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Calendar, ArrowRight,
  Clock, Wallet, User, ChevronRight,
  TrendingUp, AlertCircle,
  Settings,
} from "lucide-react";
import { DeleteAccountButton } from "./delete-account-button";
import { getMyProfile, getMyApplications, getMyWorkRecords } from "@/lib/supabase/queries";
import { formatDate, formatCurrency } from "@/lib/utils/format";

const statusMap: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  "대기": { label: "대기중", variant: "secondary" },
  "승인": { label: "승인", variant: "default" },
  "거절": { label: "거절", variant: "destructive" },
};

function getDday(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "TODAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function getDdayColor(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "bg-emerald-500 text-white";
  if (diff <= 3 && diff > 0) return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
}

export default async function MyPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [profile, applications, records] = await Promise.all([
    getMyProfile(),
    getMyApplications(),
    getMyWorkRecords(currentMonth),
  ]);

  let profileImageUrl: string | null = null;
  if (profile?.profile_image_url) {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();
    const { data: signedData } = await admin.storage
      .from("profile-photos")
      .createSignedUrl(profile.profile_image_url, 3600);
    profileImageUrl = signedData?.signedUrl ?? null;
  }

  const pendingCount = applications.filter((a) => a.status === "대기").length;
  const approvedCount = applications.filter((a) => a.status === "승인").length;
  const hasResume = !!(profile?.name && profile?.bank_name);

  const profileFields = [
    profile?.name,
    profile?.phone,
    profile?.birth_date,
    profile?.gender,
    profile?.region,
    profile?.bank_name,
    profile?.account_holder,
    profile?.account_number,
  ];
  const filledCount = profileFields.filter(Boolean).length;
  const profilePercent = Math.round((filledCount / profileFields.length) * 100);
  const upcomingJobs = applications.filter((a) => a.status === "승인").slice(0, 3);
  const monthlyNet = records.reduce((s, r) => s + r.net_pay, 0);

  const quickLinks = [
    { href: "/my/resume", icon: User, label: "프로필 관리", desc: "회원정보 등록/수정", gradient: "from-slate-500/5 to-gray-500/5", iconBg: "", iconColor: "text-slate-700" },
    { href: "/my/applications", icon: ClipboardList, label: "근무신청 조회", desc: "내 지원 현황 확인", gradient: "from-slate-500/5 to-gray-500/5", iconBg: "", iconColor: "text-slate-700" },
    { href: "/my/history", icon: Clock, label: "근무내역", desc: "월별 근무내역 조회", gradient: "from-slate-500/5 to-gray-500/5", iconBg: "", iconColor: "text-slate-700" },
    { href: "/my/salary", icon: Wallet, label: "급여신청", desc: "계약체결 및 급여신청", gradient: "from-slate-500/5 to-gray-500/5", iconBg: "", iconColor: "text-slate-700" },
  ];

  const statCards = [
    { label: "근무지원 승인 대기중", value: pendingCount, icon: ClipboardList, gradient: "from-slate-600 to-gray-600", lightBg: "from-slate-50 to-gray-50" },
    { label: "근무지원 승인됨", value: approvedCount, icon: Calendar, gradient: "from-slate-600 to-gray-600", lightBg: "from-slate-50 to-gray-50" },
    { label: "이번 달 급여", value: null, displayValue: formatCurrency(monthlyNet), icon: TrendingUp, gradient: "from-slate-600 to-gray-600", lightBg: "from-slate-50 to-gray-50" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Profile Hero Section */}
      <div className="relative overflow-hidden rounded-[13px] border border-slate-300 bg-slate-50 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative">
            <div className="flex h-[94px] w-[94px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-blue-100 to-indigo-100">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="프로필" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-blue-600" />
              )}
            </div>
            {profilePercent === 100 && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-sm">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="mt-[10px] text-xl font-bold tracking-tight sm:text-2xl">
              {profile?.name ? `${profile.name}님, 환영합니다` : "환영합니다"}
            </h1>
            <p className="mt-[10px] text-sm text-muted-foreground">오늘도 좋은 하루 되세요.</p>

          </div>
        </div>

        {/* Profile Action Badges */}
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="cursor-pointer gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-200">
            <Settings className="h-3 w-3" />
            비밀번호 수정
          </Badge>
          <DeleteAccountButton />
        </div>
      </div>

      {/* Stat Cards */}
      <Card className="overflow-hidden border-slate-300 shadow-none py-0">
        <CardContent className="flex items-center divide-x p-0">
          {statCards.map((stat) => (
            <div key={stat.label} className="flex flex-1 items-center gap-2.5 px-4 py-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                <stat.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold leading-tight">{stat.displayValue ?? stat.value}</p>
                <p className="text-[11px] font-medium text-foreground/80">{stat.label}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">바로가기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="group relative overflow-hidden border border-slate-300 shadow-none transition-all duration-300 hover:-translate-y-0.5 py-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <CardContent className="relative flex items-center gap-4 p-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${link.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                    <link.icon className={`h-5 w-5 ${link.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming Jobs */}
      {upcomingJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">다가오는 근무</h2>
            <Link href="/my/applications" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
              전체보기
            </Link>
          </div>
          <Card className="overflow-hidden border-slate-300 shadow-none py-0">
            <CardContent className="p-0 divide-y">
              {upcomingJobs.map((app) => {
                const s = statusMap[app.status] ?? statusMap["대기"];
                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30"
                  >
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${getDdayColor(app.job_postings.work_date)}`}>
                      {getDday(app.job_postings.work_date)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {app.job_postings.clients.company_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(app.job_postings.work_date)}{" "}
                        {app.job_postings.start_time.slice(0, 5)}~{app.job_postings.end_time.slice(0, 5)}
                      </p>
                    </div>
                    <Badge
                      variant={s.variant}
                      className={`shrink-0 text-[11px] ${s.variant === "default" ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10" : ""}`}
                    >
                      {s.label}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resume CTA */}
      {!hasResume && (
        <Card className="relative overflow-hidden border-slate-300 shadow-none py-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30" />
          <CardContent className="relative py-8 text-center">
            <p className="text-lg font-bold">회원정보를 등록해 주세요</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              회원정보 등록 후 채용공고에 지원할 수 있습니다.
            </p>
            <Link href="/my/resume">
              <Button className="mt-5 rounded-none bg-red-400 px-6 hover:bg-red-500 transition-all duration-300">
                회원정보 등록하기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

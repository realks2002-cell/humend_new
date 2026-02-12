export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, ClipboardList, Calendar, ArrowRight,
  Clock, Wallet, FileSignature, User,
} from "lucide-react";
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
  if (diff === 0) return "bg-green-600 text-white";
  if (diff <= 3 && diff > 0) return "bg-orange-500 text-white";
  return "bg-gray-600 text-white";
}

export default async function MyPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [profile, applications, records] = await Promise.all([
    getMyProfile(),
    getMyApplications(),
    getMyWorkRecords(currentMonth),
  ]);

  // 프로필 사진 signed URL
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

  // Profile completion calculation
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
    { href: "/my/resume", icon: User, label: "프로필 관리", desc: "회원정보, 비밀번호, 계정 관리", color: "text-gray-600", isProfile: true },
    { href: "/my/applications", icon: ClipboardList, label: "근무신청 조회", desc: "내 지원 현황을 확인하세요", color: "text-blue-500" },
    { href: "/my/history", icon: Clock, label: "근무내역", desc: "월별 근무내역 조회", color: "text-orange-500" },
    { href: "/my/salary", icon: Wallet, label: "급여신청", desc: "근무 건 계약체결 및 급여신청", color: "text-gray-600" },
    // { href: "/my/contracts", icon: FileSignature, label: "계약서", desc: "서명한 계약서 보기", color: "text-red-500" },
  ];

  return (
    <div className="mx-auto max-w-3xl animate-in fade-in duration-500 px-4 py-8">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
          {profileImageUrl ? (
            <img src={profileImageUrl} alt="프로필" className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {profile?.name ? `${profile.name}님 환영합니다.` : "환영합니다."}
          </h1>
          <p className="text-sm text-muted-foreground">오늘도 좋은 하루 되세요.</p>
          {profilePercent < 100 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>프로필 완성도</span>
                <span className="font-medium">{profilePercent}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${profilePercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card className="border-blue-300 bg-gradient-to-br from-blue-50/50 to-background">
          <CardContent className="pt-4 text-center">
            <ClipboardList className="mx-auto mb-1 h-5 w-5 text-blue-500" />
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">대기중</p>
          </CardContent>
        </Card>
        <Card className="border-orange-300 bg-gradient-to-br from-orange-50/50 to-background">
          <CardContent className="pt-4 text-center">
            <Calendar className="mx-auto mb-1 h-5 w-5 text-orange-500" />
            <p className="text-2xl font-bold">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">승인됨</p>
          </CardContent>
        </Card>
        <Card className="border-gray-400 bg-gradient-to-br from-gray-50/50 to-background">
          <CardContent className="pt-4 text-center">
            <Wallet className="mx-auto mb-1 h-5 w-5 text-gray-600" />
            <p className="text-lg font-bold">{formatCurrency(monthlyNet)}</p>
            <p className="text-xs text-muted-foreground">이번 달</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {quickLinks.map((link) => {
          if ((link as Record<string, unknown>).isProfile) {
            return (
              <Card key={link.href} className="border-gray-400 transition-all hover:shadow-md">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                      <link.icon className={`h-5 w-5 ${link.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">{link.label}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/my/resume">
                      <Badge className="cursor-pointer bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
                        회원정보 등록/수정
                      </Badge>
                    </Link>
                    <Badge className="cursor-pointer bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
                      비밀번호 수정
                    </Badge>
                    <Badge className="cursor-pointer bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
                      회원탈퇴
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return (
            <Link key={link.href} href={link.href}>
              <Card className="group h-full border-gray-400 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex h-full items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 transition-colors group-hover:bg-primary/10">
                      <link.icon className={`h-5 w-5 ${link.color} transition-transform group-hover:scale-110`} />
                    </div>
                    <div>
                      <p className="font-medium">{link.label}</p>
                      <p className="text-sm text-muted-foreground">{link.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Upcoming Jobs */}
      {upcomingJobs.length > 0 && (
        <Card className="mt-6 border-gray-400">
          <CardHeader>
            <CardTitle className="text-base">다가오는 근무</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingJobs.map((app) => {
              const s = statusMap[app.status] ?? statusMap["대기"];
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${getDdayColor(app.job_postings.work_date)}`}>
                      {getDday(app.job_postings.work_date)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {app.job_postings.clients.company_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(app.job_postings.work_date)}{" "}
                        {app.job_postings.start_time}~{app.job_postings.end_time}
                      </p>
                    </div>
                  </div>
                  <Badge variant={s.variant} className={s.variant === "default" ? "bg-green-600 hover:bg-green-600" : ""}>{s.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Resume CTA */}
      {!hasResume && (
        <Card className="mt-6 border-orange-300 bg-gradient-to-r from-orange-50/50 to-background">
          <CardContent className="py-4 text-center">
            <User className="mx-auto mb-2 h-8 w-8 text-orange-500" />
            <p className="font-medium">회원정보를 등록해 주세요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              회원정보 등록 후 채용공고에 지원할 수 있습니다.
            </p>
            <Link href="/my/resume">
              <Badge className="mt-3 cursor-pointer bg-orange-500 px-4 py-1.5 text-white hover:bg-orange-600">
                회원정보 등록하기
              </Badge>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

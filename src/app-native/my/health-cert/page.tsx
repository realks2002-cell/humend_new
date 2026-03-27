"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Upload, ImageIcon, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile } from "@/lib/native-api/queries";
import type { Member } from "@/lib/native-api/queries";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function getToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

function HealthCertForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateInput, setDateInput] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDateInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 8) raw = raw.slice(0, 8);
    let formatted = raw;
    if (raw.length > 4) formatted = raw.slice(0, 4) + "-" + raw.slice(4);
    if (raw.length > 6) formatted = raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6);
    setDateInput(formatted);
    if (raw.length === 8) {
      const parsed = parse(formatted, "yyyy-MM-dd", new Date());
      if (isValid(parsed) && parsed <= new Date()) setDate(parsed);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("이미지 파일만 업로드 가능합니다."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("파일 크기는 10MB 이하여야 합니다."); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!date) { toast.error("보건증 진단일을 선택해주세요."); return; }
    if (!preview) { toast.error("보건증 이미지를 첨부해주세요."); return; }
    setLoading(true);
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/native/my/health-cert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: format(date, "yyyy-MM-dd"), imageDataUrl: preview }),
    });
    const result = await res.json();
    setLoading(false);
    if (result.error) { toast.error("제출 실패", { description: result.error }); return; }
    toast.success("보건증이 제출되었습니다.");
    onSubmitted();
  }

  return (
    <div className="px-4 py-8 pb-32 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-center">보건증 제출</h1>
      <Card className="overflow-hidden py-0">
        <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
          보건증 정보
        </div>
        <CardContent className="space-y-5 p-5">
          <div className="space-y-2">
            <Label>보건증 진단일</Label>
            <div className="flex gap-2">
              <Input placeholder="YYYY-MM-DD" value={dateInput} onChange={handleDateInputChange} className="flex-1" />
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { setDate(d); if (d) setDateInput(format(d, "yyyy-MM-dd")); setCalendarOpen(false); }}
                    disabled={(d) => d > new Date()}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {date && <p className="text-xs text-muted-foreground">{format(date, "yyyy년 M월 d일", { locale: ko })}</p>}
          </div>
          <div className="space-y-2">
            <Label>보건증 이미지</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {preview ? (
              <div className="space-y-3">
                <div className="relative rounded-lg border overflow-hidden bg-white">
                  <img src={preview} alt="보건증 미리보기" className="w-full max-h-80 object-contain" />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                  <ImageIcon className="mr-2 h-4 w-4" />다른 이미지 선택
                </Button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-10 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground/60" />
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">보건증 이미지를 업로드하세요</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">JPG, PNG (최대 10MB)</p>
                </div>
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      <Button className="w-full" onClick={handleSubmit} disabled={loading || !date || !preview}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />제출 중...</> : "보건증 제출"}
      </Button>
    </div>
  );
}

function HealthCertView({ profile, onDeleted }: { profile: Member; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("보건증을 삭제하고 다시 제출하시겠습니까?")) return;
    setDeleting(true);
    const token = await getToken();
    const res = await fetch(`${API_BASE}/api/native/my/health-cert`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    setDeleting(false);
    if (result.error) { toast.error("삭제 실패", { description: result.error }); return; }
    toast.success("보건증이 삭제되었습니다. 다시 제출해주세요.");
    onDeleted();
  }

  const certDate = (profile as unknown as Record<string, unknown>).health_cert_date as string;
  const certUrl = (profile as unknown as Record<string, unknown>).health_cert_image_url as string;
  const d = new Date(certDate);
  const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

  return (
    <div className="px-4 py-8 pb-32 space-y-6">
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">보건증 제출 완료</p>
          <p className="text-xs text-emerald-600">진단일: {dateStr}</p>
        </div>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-center">보건증 제출</h1>
      <Card className="overflow-hidden py-0">
        <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
          보건증 정보
        </div>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center px-5 py-3">
              <span className="w-24 text-sm text-muted-foreground shrink-0">진단일</span>
              <span className="text-sm font-medium">{dateStr}</span>
            </div>
          </div>
          <div className="p-5">
            <div className="rounded-lg border overflow-hidden bg-white">
              <img src={certUrl} alt="보건증" className="w-full max-h-96 object-contain" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full" onClick={handleDelete} disabled={deleting}>
        <RotateCcw className="mr-2 h-4 w-4" />{deleting ? "처리중..." : "다시 제출"}
      </Button>
    </div>
  );
}

export default function HealthCertPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/login"); return; }
      getMyProfile().then((p) => { setProfile(p); setLoading(false); });
    });
  }, [router, key]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  const hasCert = !!(profile as unknown as Record<string, unknown>).health_cert_date && !!(profile as unknown as Record<string, unknown>).health_cert_image_url;

  if (hasCert) {
    return <HealthCertView profile={profile} onDeleted={() => { setLoading(true); setKey((k) => k + 1); }} />;
  }

  return <HealthCertForm onSubmitted={() => { setLoading(true); setKey((k) => k + 1); }} />;
}

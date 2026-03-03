"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil } from "lucide-react";
import { createJobPosting, updateJobPosting } from "./actions";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface ClientOption {
  id: string;
  company_name: string;
  client_type?: 'daily' | 'fixed_term';
}

function WeekdayToggle({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(day: number) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  }

  return (
    <div className="flex gap-1.5">
      {WEEKDAY_LABELS.map((label, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => toggle(idx)}
          className={`h-9 w-9 rounded-full text-xs font-medium border transition-colors ${
            selected.includes(idx)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-input hover:bg-muted"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function CreateJobButton({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [postingType, setPostingType] = useState<"daily" | "fixed_term">("daily");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const filteredClients = clients.filter((c) =>
    postingType === "fixed_term"
      ? c.client_type === "fixed_term"
      : c.client_type !== "fixed_term"
  );

  const handlePostingTypeChange = (type: "daily" | "fixed_term") => {
    setPostingType(type);
    setClientId("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("client_id", clientId);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("posting_type", postingType);

    if (postingType === "fixed_term") {
      formData.set("work_days", JSON.stringify(workDays));
    }

    const result = await createJobPosting(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setClientId("");
    setStartTime("");
    setEndTime("");
    setPostingType("daily");
    setWorkDays([1, 2, 3, 4, 5]);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          공고 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>공고 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          {/* 공고 유형 토글 — 고객사보다 먼저 선택 */}
          <div>
            <Label>공고 유형</Label>
            <div className="mt-1.5 flex rounded-lg border p-1">
              <button
                type="button"
                onClick={() => handlePostingTypeChange("daily")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  postingType === "daily"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                일별
              </button>
              <button
                type="button"
                onClick={() => handlePostingTypeChange("fixed_term")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  postingType === "fixed_term"
                    ? "bg-violet-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                기간제
              </button>
            </div>
          </div>

          <div>
            <Label>고객사 *</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger>
                <SelectValue placeholder="고객사 선택" />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredClients.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {postingType === "fixed_term" ? "기간제" : "일별"} 타입의 고객사가 없습니다.
              </p>
            )}
          </div>

          {postingType === "daily" ? (
            <div>
              <Label htmlFor="work_date">근무일 *</Label>
              <Input id="work_date" name="work_date" type="date" required />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="title">공고 제목</Label>
                <Input id="title" name="title" placeholder="예: 3월 장기근무" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start_date">시작일 *</Label>
                  <Input id="start_date" name="start_date" type="date" required />
                </div>
                <div>
                  <Label htmlFor="end_date">종료일 *</Label>
                  <Input id="end_date" name="end_date" type="date" required />
                </div>
              </div>
              <div>
                <Label>근무 요일 *</Label>
                <div className="mt-1.5">
                  <WeekdayToggle selected={workDays} onChange={setWorkDays} />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>시작 시간 *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="시작" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>종료 시간 *</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="종료" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="headcount">모집 인원 *</Label>
            <Input
              id="headcount"
              name="headcount"
              type="number"
              min={1}
              defaultValue={1}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={
                loading || !clientId || !startTime || !endTime ||
                (postingType === "fixed_term" && workDays.length === 0)
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              등록
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddSlotButton({ clientId, clients }: { clientId: string; clients: ClientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("client_id", clientId);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("posting_type", "daily");

    const result = await createJobPosting(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setStartTime("");
    setEndTime("");
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          일정 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>일정 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <div>
            <Label htmlFor="work_date">근무일 *</Label>
            <Input id="work_date" name="work_date" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>시작 *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="시작" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>종료 *</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="종료" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="headcount">모집 인원</Label>
            <Input id="headcount" name="headcount" type="number" min={1} defaultValue={1} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading || !startTime || !endTime}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              추가
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface JobData {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  headcount: number;
  status: string;
  posting_type?: 'daily' | 'fixed_term';
  start_date?: string | null;
  end_date?: string | null;
  work_days?: number[] | null;
  title?: string | null;
}

export function EditJobButton({ job }: { job: JobData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startTime, setStartTime] = useState(job.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(job.end_time.slice(0, 5));
  const [status, setStatus] = useState(job.status);
  const [workDays, setWorkDays] = useState<number[]>(job.work_days ?? [1, 2, 3, 4, 5]);

  const isFixedTerm = job.posting_type === "fixed_term";

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setStartTime(job.start_time.slice(0, 5));
      setEndTime(job.end_time.slice(0, 5));
      setStatus(job.status);
      setWorkDays(job.work_days ?? [1, 2, 3, 4, 5]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("status", status);
    formData.set("posting_type", job.posting_type ?? "daily");

    if (isFixedTerm) {
      formData.set("work_days", JSON.stringify(workDays));
    }

    const result = await updateJobPosting(job.id, formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isFixedTerm ? "기간제 공고 수정" : "일정 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {isFixedTerm ? (
            <>
              <div>
                <Label htmlFor="edit_title">공고 제목</Label>
                <Input id="edit_title" name="title" defaultValue={job.title ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit_start_date">시작일 *</Label>
                  <Input id="edit_start_date" name="start_date" type="date" defaultValue={job.start_date ?? ""} required />
                </div>
                <div>
                  <Label htmlFor="edit_end_date">종료일 *</Label>
                  <Input id="edit_end_date" name="end_date" type="date" defaultValue={job.end_date ?? ""} required />
                </div>
              </div>
              <div>
                <Label>근무 요일 *</Label>
                <div className="mt-1.5">
                  <WeekdayToggle selected={workDays} onChange={setWorkDays} />
                </div>
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="edit_work_date">근무일 *</Label>
              <Input id="edit_work_date" name="work_date" type="date" defaultValue={job.work_date} required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>시작 *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="시작" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>종료 *</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="종료" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="edit_headcount">모집 인원</Label>
            <Input id="edit_headcount" name="headcount" type="number" min={1} defaultValue={job.headcount} required />
          </div>
          <div>
            <Label>상태</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">모집중</SelectItem>
                <SelectItem value="closed">마감</SelectItem>
                <SelectItem value="completed">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading || !startTime || !endTime}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

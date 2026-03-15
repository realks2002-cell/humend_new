"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Search,
  MapPin,
  Clock,
  Phone,
  Users,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ArrivalStatus } from "@/types/location";
import { createShift, deleteShift } from "./actions";
import { ShiftMapModal } from "./shift-map-modal";

function getDisplayStatus(shift: { arrival_status: ArrivalStatus; work_date: string; start_time: string; last_seen_at: string | null }, mounted: boolean): ArrivalStatus {
  if (!mounted) return shift.arrival_status;
  const status = shift.arrival_status;
  if (["arrived", "late", "noshow"].includes(status)) return status;
  const now = Date.now();
  const startTimeNorm = shift.start_time.length === 5 ? shift.start_time + ":00" : shift.start_time;
  const shiftStart = new Date(`${shift.work_date}T${startTimeNorm}+09:00`).getTime();
  if (now > shiftStart) return "late";
  if (
    shift.last_seen_at &&
    ["tracking", "moving"].includes(status) &&
    now - new Date(shift.last_seen_at).getTime() > 5 * 60 * 1000
  ) return "offline";
  return status;
}

export interface ShiftWithDetails {
  id: string;
  client_id: string;
  member_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  arrival_status: ArrivalStatus;
  risk_level: number;
  arrived_at: string | null;
  left_site_at: string | null;
  offsite_count: number;
  last_known_lat: number | null;
  last_known_lng: number | null;
  last_seen_at: string | null;
  location_consent: boolean;
  clients: {
    company_name: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    contact_phone: string;
  };
  members: {
    name: string | null;
    phone: string;
  };
}

interface Client {
  id: string;
  company_name: string;
  location: string;
}

interface Member {
  id: string;
  name: string | null;
  phone: string;
}

export interface ApprovedPosting {
  postingId: string;
  clientId: string;
  clientName: string;
  clientLocation: string;
  workDate: string;
  startTime: string;
  endTime: string;
  approvedMembers: { id: string; name: string | null; phone: string }[];
}

const statusConfig: Record<
  ArrivalStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  pending: { label: "대기", variant: "secondary" },
  tracking: {
    label: "출근중",
    variant: "outline",
    className: "border-blue-300 text-blue-600",
  },
  moving: {
    label: "출근중",
    variant: "outline",
    className: "border-blue-500 text-blue-700",
  },
  offline: {
    label: "오프라인",
    variant: "outline",
    className: "border-gray-400 text-gray-500",
  },
  late_risk: {
    label: "지각위험",
    variant: "outline",
    className: "border-orange-400 text-orange-600",
  },
  noshow_risk: { label: "노쇼위험", variant: "destructive" },
  arrived: {
    label: "출근완료",
    variant: "default",
    className: "bg-green-600",
  },
  late: {
    label: "지각출근",
    variant: "outline",
    className: "border-orange-500 text-orange-700",
  },
  noshow: {
    label: "노쇼",
    variant: "destructive",
    className: "bg-red-700",
  },
};

export function ShiftTable({
  shifts,
  clients,
  members,
  selectedDate,
  approvedPostings = [],
}: {
  shifts: ShiftWithDetails[];
  clients: Client[];
  members: Member[];
  selectedDate: string;
  approvedPostings?: ApprovedPosting[];
}) {
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [showForm, setShowForm] = useState(false);
  const [mapShifts, setMapShifts] = useState<ShiftWithDetails[] | null>(null);

  // 등록 폼 상태
  const [formClientId, setFormClientId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("17:00");

  const statusCounts = useMemo(() => {
    const statuses = shifts.map((s) => getDisplayStatus(s, mounted));
    const moving = statuses.filter((st) =>
      ["tracking", "moving", "late_risk", "noshow_risk"].includes(st)
    ).length;
    const arrived = statuses.filter((st) => st === "arrived").length;
    const late = statuses.filter((st) => st === "late").length;
    const noshow = statuses.filter((st) => st === "noshow").length;
    const offline = statuses.filter((st) => st === "offline").length;
    return { moving, arrived, late, noshow, offline };
  }, [shifts]);

  const groupedShifts = useMemo(() => {
    const map = new Map<string, ShiftWithDetails[]>();
    for (const shift of shifts) {
      const key = `${shift.client_id}_${shift.start_time}_${shift.end_time}`;
      const group = map.get(key);
      if (group) {
        group.push(shift);
      } else {
        map.set(key, [shift]);
      }
    }
    return Array.from(map.entries()).map(([key, shifts]) => ({ key, shifts }));
  }, [shifts]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [members, memberSearch]);

  function handleApprovedPostingSelect(postingId: string) {
    const posting = approvedPostings.find((p) => p.postingId === postingId);
    if (!posting) return;

    setFormClientId(posting.clientId);
    setFormStartTime(posting.startTime.slice(0, 5));
    setFormEndTime(posting.endTime.slice(0, 5));
    setSelectedMembers(posting.approvedMembers.map((m) => m.id));
  }

  function handleClientSelect(clientId: string) {
    setFormClientId(clientId);
    const posting = approvedPostings.find((p) => p.clientId === clientId);
    if (posting) {
      setSelectedMembers(posting.approvedMembers.map((m) => m.id));
      setFormStartTime(posting.startTime.slice(0, 5));
      setFormEndTime(posting.endTime.slice(0, 5));
    } else {
      setSelectedMembers([]);
    }
  }

  function resetForm() {
    setFormClientId("");
    setSelectedMembers([]);
    setMemberSearch("");
    setFormStartTime("08:00");
    setFormEndTime("17:00");
  }

  async function handleCreate() {
    if (!formClientId || selectedMembers.length === 0) return;
    startTransition(async () => {
      const result = await createShift(
        formClientId,
        selectedMembers,
        selectedDate,
        formStartTime,
        formEndTime
      );
      if (result.error) {
        alert(result.error);
      } else {
        setShowForm(false);
        resetForm();
      }
    });
  }

  async function handleDelete(shiftId: string) {
    if (!confirm("이 배정을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const result = await deleteShift(shiftId);
      if (result.error) alert(result.error);
    });
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="space-y-4">
      {/* 상단: 카운트 + 등록 버튼 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            총 {shifts.length}명
          </Badge>
          <Badge variant="outline" className="text-sm border-gray-400 text-gray-500">
            오프라인 {statusCounts.offline}
          </Badge>
          <Badge variant="outline" className="text-sm border-blue-500 text-blue-700">
            이동중 {statusCounts.moving}
          </Badge>
          <Badge className="text-sm bg-green-600">
            출근완료 {statusCounts.arrived}
          </Badge>
          <Badge variant="outline" className="text-sm border-orange-500 text-orange-700">
            지각 {statusCounts.late}
          </Badge>
          <Badge variant="destructive" className="text-sm bg-red-700">
            노쇼 {statusCounts.noshow}
          </Badge>
        </div>

        <div className="ml-auto">
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            근무 배정 등록
          </Button>
        </div>
      </div>

      {/* 등록 다이얼로그 */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>근무 배정 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 승인된 공고 불러오기 */}
            {approvedPostings.length > 0 && (
              <div>
                <Label>공고에서 불러오기</Label>
                <Select onValueChange={handleApprovedPostingSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="해당 날짜 공고에서 불러오기" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedPostings.map((p) => (
                      <SelectItem key={p.postingId} value={p.postingId}>
                        {p.clientName} - {p.startTime.slice(0, 5)}~
                        {p.endTime.slice(0, 5)} ({p.approvedMembers.length > 0 ? `${p.approvedMembers.length}명 승인` : "지원자 없음"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  선택 시 고객사, 시간, 승인 회원이 자동으로 채워집니다.
                </p>
              </div>
            )}

            <div>
              <Label>날짜</Label>
              <Input value={selectedDate} disabled />
            </div>
            <div>
              <Label>고객사</Label>
              <Select value={formClientId} onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="고객사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name} ({c.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>시작 시간</Label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label>종료 시간</Label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>회원 선택 ({selectedMembers.length}명)</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름 또는 전화번호 검색"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                {filteredMembers.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(m.id)}
                      onCheckedChange={() => toggleMember(m.id)}
                    />
                    <span>{m.name ?? "이름없음"}</span>
                    <span className="text-muted-foreground">{m.phone}</span>
                  </label>
                ))}
                {filteredMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    검색 결과가 없습니다
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                isPending || !formClientId || selectedMembers.length === 0
              }
            >
              {isPending ? "등록 중..." : `${selectedMembers.length}명 배정`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 배정 카드 그리드 - 고객사+시간 기준 그룹화 */}
      {shifts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          해당 날짜에 배정된 근무가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {groupedShifts.map(({ key, shifts: groupShifts }) => {
            const first = groupShifts[0];
            return (
              <div
                key={key}
                className="rounded-lg border bg-card overflow-hidden"
              >
                {/* 카드 헤더: 고객사 + 시간 */}
                <div className="p-4 pb-2 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">
                      {first.clients.company_name}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => setMapShifts(groupShifts)}
                      title="지도 보기"
                    >
                      <MapIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {first.clients.location}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      {first.start_time.slice(0, 5)} ~{" "}
                      {first.end_time.slice(0, 5)}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                      총 {groupShifts.length}명
                    </Badge>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-gray-400 text-gray-500">
                      오프라인 {groupShifts.filter((s) => getDisplayStatus(s, mounted) === "offline").length}
                    </Badge>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-blue-500 text-blue-700">
                      이동중 {groupShifts.filter((s) => ["tracking", "moving", "late_risk", "noshow_risk"].includes(getDisplayStatus(s, mounted))).length}
                    </Badge>
                    <Badge className="text-[11px] px-1.5 py-0 bg-green-600">
                      출근완료 {groupShifts.filter((s) => getDisplayStatus(s, mounted) === "arrived").length}
                    </Badge>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-orange-500 text-orange-700">
                      지각 {groupShifts.filter((s) => getDisplayStatus(s, mounted) === "late").length}
                    </Badge>
                    <Badge variant="destructive" className="text-[11px] px-1.5 py-0 bg-red-700">
                      노쇼 {groupShifts.filter((s) => getDisplayStatus(s, mounted) === "noshow").length}
                    </Badge>
                  </div>
                </div>

                {/* 회원 리스트 */}
                <div className="border-t divide-y">
                  {groupShifts.map((shift) => {
                    const config = statusConfig[getDisplayStatus(shift, mounted)];
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {shift.members.name ?? "이름없음"}
                            </span>
                            <span className="text-muted-foreground text-xs shrink-0">
                              {shift.members.phone}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={config.variant}
                          className={cn("shrink-0 text-xs", config.className)}
                        >
                          {config.label}
                        </Badge>
                        {shift.left_site_at ? (
                          <span className="text-orange-600 text-xs shrink-0 tabular-nums">
                            {new Date(shift.left_site_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs shrink-0">—</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 shrink-0"
                          onClick={() => handleDelete(shift.id)}
                          disabled={isPending}
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShiftMapModal
        open={mapShifts !== null}
        onOpenChange={(open) => { if (!open) setMapShifts(null); }}
        shifts={mapShifts ?? []}
      />
    </div>
  );
}

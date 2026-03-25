"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Plus,
  Trash2,
  Search,
  MapPin,
  Clock,
  Phone,
  Users,
  Map as MapIcon,
  Pencil,
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
import type { AttendanceStatus } from "@/types/location";
import { createShift, deleteShift, updateShiftGroup } from "./actions";
import { ShiftMapModal } from "./shift-map-modal";

function getDisplayStatus(shift: { arrival_status: AttendanceStatus }): AttendanceStatus {
  return shift.arrival_status;
}

export interface ShiftWithDetails {
  id: string;
  client_id: string;
  member_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  arrival_status: AttendanceStatus;
  arrived_at: string | null;
  confirmed_at: string | null;
  nearby_at: string | null;
  alert_minutes_before: number;
  notification_sent_count: number;
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
  AttendanceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  pending: { label: "대기", variant: "secondary" },
  notified: {
    label: "알림발송",
    variant: "outline",
    className: "border-yellow-400 text-yellow-600",
  },
  confirmed: {
    label: "출근예정",
    variant: "outline",
    className: "border-blue-500 text-blue-700",
  },
  arrived: {
    label: "출근완료",
    variant: "default",
    className: "bg-green-600",
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
  const [showForm, setShowForm] = useState(false);
  const [mapShifts, setMapShifts] = useState<ShiftWithDetails[] | null>(null);

  // 등록 폼 상태
  const [formClientId, setFormClientId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("17:00");

  // 수정 다이얼로그 상태
  const [editGroup, setEditGroup] = useState<{
    shiftIds: string[];
    clientId: string;
    clientName: string;
    date: string;
    startTime: string;
    endTime: string;
    memberIds: string[];
  } | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editSelectedMembers, setEditSelectedMembers] = useState<string[]>([]);
  const [editMemberSearch, setEditMemberSearch] = useState("");

  const statusCounts = useMemo(() => {
    const statuses = shifts.map((s) => getDisplayStatus(s));
    const pending = statuses.filter((st) => st === "pending").length;
    const notified = statuses.filter((st) => st === "notified").length;
    const confirmed = statuses.filter((st) => st === "confirmed").length;
    const arrived = statuses.filter((st) => st === "arrived").length;
    const noshow = statuses.filter((st) => st === "noshow").length;
    return { pending, notified, confirmed, arrived, noshow };
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

  const editFilteredMembers = useMemo(() => {
    if (!editMemberSearch) return members;
    const q = editMemberSearch.toLowerCase();
    return members.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [members, editMemberSearch]);

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

  function openEditDialog(groupShifts: ShiftWithDetails[]) {
    const first = groupShifts[0];
    setEditGroup({
      shiftIds: groupShifts.map((s) => s.id),
      clientId: first.client_id,
      clientName: first.clients.company_name,
      date: first.work_date,
      startTime: first.start_time.slice(0, 5),
      endTime: first.end_time.slice(0, 5),
      memberIds: groupShifts.map((s) => s.member_id),
    });
    setEditDate(first.work_date);
    setEditStartTime(first.start_time.slice(0, 5));
    setEditEndTime(first.end_time.slice(0, 5));
    setEditSelectedMembers(groupShifts.map((s) => s.member_id));
    setEditMemberSearch("");
  }

  function closeEditDialog() {
    setEditGroup(null);
    setEditMemberSearch("");
  }

  async function handleUpdate() {
    if (!editGroup || editSelectedMembers.length === 0) return;
    startTransition(async () => {
      const result = await updateShiftGroup(
        editGroup.shiftIds,
        editGroup.clientId,
        editDate,
        editStartTime,
        editEndTime,
        editSelectedMembers
      );
      if (result.error) {
        alert(result.error);
      } else {
        closeEditDialog();
      }
    });
  }

  const toggleEditMember = (memberId: string) => {
    setEditSelectedMembers((prev) =>
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
          <Badge variant="secondary" className="text-sm">
            대기 {statusCounts.pending}
          </Badge>
          <Badge variant="outline" className="text-sm border-yellow-400 text-yellow-600">
            알림발송 {statusCounts.notified}
          </Badge>
          <Badge variant="outline" className="text-sm border-blue-500 text-blue-700">
            출근예정 {statusCounts.confirmed}
          </Badge>
          <Badge className="text-sm bg-green-600">
            출근완료 {statusCounts.arrived}
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
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setMapShifts(groupShifts)}
                        title="지도 보기"
                      >
                        <MapIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openEditDialog(groupShifts)}
                        title="수정"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
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
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-yellow-400 text-yellow-600">
                      알림 {groupShifts.filter((s) => getDisplayStatus(s) === "notified").length}
                    </Badge>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-blue-500 text-blue-700">
                      출근예정 {groupShifts.filter((s) => getDisplayStatus(s) === "confirmed").length}
                    </Badge>
                    <Badge className="text-[11px] px-1.5 py-0 bg-green-600">
                      출근완료 {groupShifts.filter((s) => getDisplayStatus(s) === "arrived").length}
                    </Badge>
                    <Badge variant="destructive" className="text-[11px] px-1.5 py-0 bg-red-700">
                      노쇼 {groupShifts.filter((s) => getDisplayStatus(s) === "noshow").length}
                    </Badge>
                  </div>
                </div>

                {/* 회원 리스트 */}
                <div className="border-t divide-y">
                  {groupShifts.map((shift) => {
                    const config = statusConfig[getDisplayStatus(shift)];
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
                        {shift.nearby_at && shift.arrival_status !== "arrived" ? (
                          <span className="text-blue-600 text-xs shrink-0 tabular-nums">
                            접근 {new Date(shift.nearby_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : shift.arrived_at ? (
                          <span className="text-green-600 text-xs shrink-0 tabular-nums">
                            {new Date(shift.arrived_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
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

      {/* 수정 다이얼로그 */}
      <Dialog
        open={editGroup !== null}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>근무 배정 수정</DialogTitle>
          </DialogHeader>
          {editGroup && (
            <div className="space-y-4">
              <div>
                <Label>고객사</Label>
                <Input value={editGroup.clientName} disabled />
              </div>
              <div>
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>시작 시간</Label>
                  <Input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>종료 시간</Label>
                  <Input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>회원 선택 ({editSelectedMembers.length}명)</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="이름 또는 전화번호 검색"
                    value={editMemberSearch}
                    onChange={(e) => setEditMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                  {editFilteredMembers.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={editSelectedMembers.includes(m.id)}
                        onCheckedChange={() => toggleEditMember(m.id)}
                      />
                      <span>{m.name ?? "이름없음"}</span>
                      <span className="text-muted-foreground">{m.phone}</span>
                    </label>
                  ))}
                  {editFilteredMembers.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      검색 결과가 없습니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              취소
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isPending || editSelectedMembers.length === 0}
            >
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShiftMapModal
        open={mapShifts !== null}
        onOpenChange={(open) => { if (!open) setMapShifts(null); }}
        shifts={mapShifts ?? []}
      />
    </div>
  );
}

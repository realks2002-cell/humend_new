"use client";

import { useState, useEffect, useTransition, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Search,
  MapPin,
  Clock,
  Map as MapIcon,
  Pencil,
  ClipboardPaste,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/location";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createShift, deleteShift, deleteShiftGroup, updateShiftGroup, updateShiftSortOrder, sendGroupFcm } from "./actions";
import { ShiftMapModal } from "./shift-map-modal";

export interface NotificationLog {
  id: string;
  title: string;
  body: string;
  target_member_id: string;
  shift_id: string | null;
  sent_count: number;
  trigger_type: "auto" | "manual";
  created_at: string;
}

export interface DepartureLog {
  id: string;
  departed_at: string;
  returned_at: string | null;
  duration_minutes: number | null;
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
  approaching_at: string | null;
  nearby_at: string | null;
  alert_minutes_before: number;
  notification_sent_count: number;
  sort_order: number;
  departure_logs?: DepartureLog[];
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

export interface ClientPosting {
  clientId: string;
  clientName: string;
  clientLocation: string;
  postings: {
    postingId: string;
    workDate: string;
    startTime: string;
    endTime: string;
    approvedMembers: { id: string; name: string | null; phone: string }[];
  }[];
}

const ALERT_TIME_OPTIONS = [
  { value: 30, label: "30분 전" },
  { value: 60, label: "60분 전" },
  { value: 90, label: "90분 전" },
  { value: 120, label: "120분 전" },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function parseExcelPaste(text: string, allMembers: Member[]) {
  const lines = text.trim().split("\n").filter(Boolean);
  const matched: Member[] = [];
  const unmatched: string[] = [];
  const phoneRe = /01[016789]-?\d{3,4}-?\d{4}/;
  for (const line of lines) {
    const pm = line.match(phoneRe);
    if (pm) {
      const norm = pm[0].replace(/-/g, "");
      const m = allMembers.find((x) => x.phone.replace(/-/g, "") === norm);
      if (m && !matched.some((x) => x.id === m.id)) matched.push(m);
      else if (!m) unmatched.push(line.trim());
    } else {
      const name = line.trim().split(/\t/)[0]?.trim();
      if (name) {
        const m = allMembers.find((x) => x.name === name);
        if (m && !matched.some((x) => x.id === m.id)) matched.push(m);
        else if (!m) unmatched.push(line.trim());
      }
    }
  }
  return { matched, unmatched };
}

function ShiftCardFcm({
  memberIds,
  shiftIds,
  logs,
  isPending,
  startTransition,
}: {
  memberIds: string[];
  shiftIds: string[];
  logs: NotificationLog[];
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [msg, setMsg] = useState("");
  const shiftSet = useMemo(() => new Set(shiftIds), [shiftIds]);
  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  // 이 그룹의 발송 기록 (shift_id 기준 필터, 없으면 member_id 폴백)
  const groupLogs = useMemo(() => {
    const filtered = logs.filter((l) =>
      l.shift_id ? shiftSet.has(l.shift_id) : memberSet.has(l.target_member_id)
    );
    const seen = new Map<string, NotificationLog & { count: number }>();
    for (const l of filtered) {
      const key = `${l.created_at.slice(0, 16)}|${l.title}`;
      const existing = seen.get(key);
      if (existing) {
        existing.count++;
      } else {
        seen.set(key, { ...l, count: 1 });
      }
    }
    return Array.from(seen.values()).slice(0, 5);
  }, [logs, shiftSet, memberSet]);

  async function handleSend() {
    if (!msg.trim()) return;
    startTransition(async () => {
      const result = await sendGroupFcm(memberIds, msg.trim(), msg.trim());
      if (result.error) alert(result.error);
      else setMsg("");
    });
  }

  return (
    <div className="border-t">
      {/* 발송 기록 */}
      {groupLogs.length > 0 && (
        <div className="px-4 py-2 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">발송 기록</p>
          {groupLogs.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="tabular-nums shrink-0">
                {new Date(l.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="truncate">&quot;{l.title}&quot;</span>
              <span className="shrink-0">
                ({l.trigger_type === "auto" ? "자동" : "수동"}/{l.count}명)
              </span>
            </div>
          ))}
        </div>
      )}
      {/* 즉시 발송 */}
      <div className="px-4 py-2 flex items-center gap-2">
        <Input
          placeholder="FCM 메시지 입력"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="h-8 text-xs flex-1"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 shrink-0"
          onClick={handleSend}
          disabled={isPending || !msg.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ShiftTable({
  shifts,
  clients,
  members,
  selectedDate,
  approvedPostings: _approvedPostings = [],
  clientPostings = [],
  assignedMemberIds = [],
  notificationLogs = [],
  testMode = false,
  onCreateTestClient,
}: {
  shifts: ShiftWithDetails[];
  clients: Client[];
  members: Member[];
  selectedDate: string;
  approvedPostings?: ApprovedPosting[];
  clientPostings?: ClientPosting[];
  assignedMemberIds?: string[];
  notificationLogs?: NotificationLog[];
  testMode?: boolean;
  onCreateTestClient?: (placeName: string, lat: number, lng: number) => Promise<string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [mapShifts, setMapShifts] = useState<ShiftWithDetails[] | null>(null);

  function navigateDate(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split("T")[0];
    router.push(`/admin/shifts?date=${dateStr}`);
  }

  // 등록 폼
  const [formClientId, setFormClientId] = useState("");
  const [formDateKey, setFormDateKey] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [alertMinutesBefore, setAlertMinutesBefore] = useState(60);
  const [alertIntervalMinutes, setAlertIntervalMinutes] = useState(15);
  const [customNotifyMessage, setCustomNotifyMessage] = useState("");
  const [customRepeatMessage, setCustomRepeatMessage] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<{ matched: Member[]; unmatched: string[] } | null>(null);

  // testMode: 주소 검색으로 근무지 등록
  const [testPlaceQuery, setTestPlaceQuery] = useState("");
  const [testSearchResults, setTestSearchResults] = useState<{ address: string; lat: number; lng: number }[]>([]);
  const [testSearching, setTestSearching] = useState(false);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const handleTestSearch = async () => {
    if (!testPlaceQuery.trim() || !testMode) return;
    if (!window.google?.maps) { alert("지도가 아직 로딩 중입니다."); return; }
    if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();
    setTestSearching(true);
    try {
      const response = await geocoderRef.current.geocode({ address: testPlaceQuery });
      setTestSearchResults(response.results.map((r) => ({
        address: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
      })));
    } catch { alert("주소 검색 실패"); }
    finally { setTestSearching(false); }
  };

  const handleTestSelectAddress = async (r: { address: string; lat: number; lng: number }) => {
    if (!onCreateTestClient) return;
    try {
      const clientId = await onCreateTestClient(r.address, r.lat, r.lng);
      setFormClientId(clientId);
      setTestPlaceQuery(r.address);
      setTestSearchResults([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    }
  };

  // 수정 모드 (등록 다이얼로그 재사용)
  const [editGroup, setEditGroup] = useState<{
    shiftIds: string[];
    clientId: string;
    clientName: string;
  } | null>(null);

  const selectedClientPostings = useMemo(() => {
    if (!formClientId) return [];
    const cp = clientPostings.find((c) => c.clientId === formClientId);
    if (!cp) return [];
    const seen = new Set<string>();
    return cp.postings.filter((p) => {
      const key = `${p.workDate}|${p.startTime}|${p.endTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [formClientId, clientPostings]);

  const selectedPostingMembers = useMemo(() => {
    if (!formDateKey) return [];
    const [, , , postingId] = formDateKey.split("|");
    const cp = clientPostings.find((c) => c.clientId === formClientId);
    const posting = cp?.postings.find((p) => p.postingId === postingId);
    return posting?.approvedMembers ?? [];
  }, [formClientId, formDateKey, clientPostings]);

  const statusCounts = useMemo(() => {
    const arrived = shifts.filter((s) => s.arrival_status === "arrived").length;
    const noshow = shifts.filter((s) => s.arrival_status === "noshow").length;
    const on = shifts.filter((s) => s.confirmed_at != null && s.arrival_status !== "arrived" && s.arrival_status !== "noshow").length;
    const off = shifts.length - arrived - noshow - on;
    return { total: shifts.length, on, arrived, noshow, off };
  }, [shifts]);

  const groupedShiftsBase = useMemo(() => {
    const map = new Map<string, ShiftWithDetails[]>();
    for (const shift of shifts) {
      const key = `${shift.client_id}_${shift.start_time}_${shift.end_time}`;
      const group = map.get(key);
      if (group) group.push(shift);
      else map.set(key, [shift]);
    }
    return Array.from(map.entries())
      .map(([key, s]) => ({ key, shifts: s }))
      .sort((a, b) => Math.min(...a.shifts.map(s => s.sort_order)) - Math.min(...b.shifts.map(s => s.sort_order)));
  }, [shifts]);

  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const currentKeys = groupedShiftsBase.map(g => g.key).join(",");
  useEffect(() => {
    setCardOrder(groupedShiftsBase.map(g => g.key));
  }, [currentKeys]);

  const groupedShifts = useMemo(() => {
    const map = new Map(groupedShiftsBase.map(g => [g.key, g]));
    return cardOrder.map(key => map.get(key)).filter(Boolean) as typeof groupedShiftsBase;
  }, [groupedShiftsBase, cardOrder]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cardOrder.indexOf(active.id as string);
    const newIndex = cardOrder.indexOf(over.id as string);
    const newOrder = arrayMove(cardOrder, oldIndex, newIndex);
    setCardOrder(newOrder);
    const updates = newOrder.map((key, i) => {
      const group = groupedShiftsBase.find(g => g.key === key);
      return { shiftIds: group!.shifts.map(s => s.id), sortOrder: i };
    });
    updateShiftSortOrder(updates);
  }

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) => m.name?.toLowerCase().includes(q) || m.phone.includes(q));
  }, [members, memberSearch]);


  function handleClientSelect(clientId: string) {
    setFormClientId(clientId);
    setFormDateKey("");
    setFormStartTime("");
    setFormEndTime("");
    setSelectedMembers([]);
    setPasteText("");
    setPasteResult(null);
  }

  function handleDateSelect(dateKey: string) {
    setFormDateKey(dateKey);
    const [, startTime, endTime, postingId] = dateKey.split("|");
    setFormStartTime(startTime?.slice(0, 5) ?? "");
    setFormEndTime(endTime?.slice(0, 5) ?? "");
    const cp = clientPostings.find((c) => c.clientId === formClientId);
    const posting = cp?.postings.find((p) => p.postingId === postingId);
    if (posting) {
      setSelectedMembers(posting.approvedMembers.filter((m) => !assignedMemberIds.includes(m.id)).map((m) => m.id));
    } else {
      setSelectedMembers([]);
    }
    setPasteText("");
    setPasteResult(null);
  }

  function resetForm() {
    setFormClientId("");
    setFormDateKey("");
    setFormStartTime("");
    setFormEndTime("");
    setSelectedMembers([]);
    setMemberSearch("");
    setAlertMinutesBefore(60);
    setAlertIntervalMinutes(15);
    setCustomNotifyMessage("");
    setCustomRepeatMessage("");
    setPasteText("");
    setPasteResult(null);
    setEditGroup(null);
    setTestPlaceQuery("");
    setTestSearchResults([]);
  }

  const handlePaste = useCallback((text: string) => {
    setPasteText(text);
    if (!text.trim()) { setPasteResult(null); return; }
    const result = parseExcelPaste(text, members);
    setPasteResult(result);
    setSelectedMembers((prev) => {
      const newIds = result.matched.map((m) => m.id).filter((id) => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, [members]);

  const selectedWorkDate = formDateKey ? formDateKey.split("|")[0] : selectedDate;

  async function handleCreate() {
    if (!formClientId || !selectedWorkDate || selectedMembers.length === 0) return;
    startTransition(async () => {
      const result = await createShift(formClientId, selectedMembers, selectedWorkDate, formStartTime, formEndTime, {
        alertMinutesBefore,
        alertIntervalMinutes,
        customNotifyMessage: customNotifyMessage || undefined,
        customRepeatMessage: customRepeatMessage || undefined,
      });
      if (result.error) alert(result.error);
      else {
        setShowForm(false);
        resetForm();
        if (selectedWorkDate !== selectedDate) {
          router.push(`/admin/shifts?date=${selectedWorkDate}`);
        }
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

  const toggleMember = (id: string) => setSelectedMembers((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const toggleAllMembers = () => {
    const ids = selectedPostingMembers.filter((m) => !assignedMemberIds.includes(m.id)).map((m) => m.id);
    const allOn = ids.every((id) => selectedMembers.includes(id));
    setSelectedMembers((p) => allOn ? p.filter((x) => !ids.includes(x)) : [...p, ...ids.filter((x) => !p.includes(x))]);
  };

  function openEditDialog(gs: ShiftWithDetails[]) {
    const f = gs[0];
    setEditGroup({ shiftIds: gs.map((s) => s.id), clientId: f.client_id, clientName: f.clients.company_name });
    setFormClientId(f.client_id);
    setFormStartTime(f.start_time.slice(0, 5));
    setFormEndTime(f.end_time.slice(0, 5));
    setSelectedMembers(gs.map((s) => s.member_id));
    // formDateKey는 수정 모드에서는 사용하지 않으므로 빈 값 유지
    setFormDateKey("");
    setAlertMinutesBefore(f.alert_minutes_before ?? 60);
    setPasteText("");
    setPasteResult(null);
    setMemberSearch("");
    setShowForm(true);
  }

  async function handleSubmit() {
    if (editGroup) {
      // 수정 모드
      if (selectedMembers.length === 0) return;
      startTransition(async () => {
        const result = await updateShiftGroup(editGroup.shiftIds, editGroup.clientId, selectedDate, formStartTime, formEndTime, selectedMembers);
        if (result.error) alert(result.error);
        else { setShowForm(false); resetForm(); }
      });
    } else {
      // 등록 모드
      await handleCreate();
    }
  }

  return (
    <div className="space-y-4">
      {/* 날짜 네비게이션 */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && router.push(`/admin/shifts?date=${e.target.value}`)}
          className="w-40 h-8 text-center text-sm"
        />
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 상단 카운트 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-sm">총 {statusCounts.total}명</Badge>
          <Badge className="text-sm bg-green-600">ON {statusCounts.on}</Badge>
          <Badge variant="destructive" className="text-sm">OFF {statusCounts.off}</Badge>
          <Badge className="text-sm bg-green-700">출근 {statusCounts.arrived}</Badge>
          {statusCounts.noshow > 0 && <Badge variant="destructive" className="text-sm bg-red-700">노쇼 {statusCounts.noshow}</Badge>}
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" />근무 배정 등록</Button>
        </div>
      </div>

      {/* ===== 등록/수정 다이얼로그 ===== */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editGroup ? "근무 배정 수정" : "근무 배정 등록"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editGroup ? (
              <>
                {/* 수정 모드: 고객사 표시 + 시간 수정 가능 */}
                <div>
                  <Label>고객사</Label>
                  <Input value={editGroup.clientName} disabled />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>시작 시간</Label><Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} /></div>
                  <div><Label>종료 시간</Label><Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} /></div>
                </div>
              </>
            ) : (
              <>
                {testMode ? (
                  <>
                    {/* 테스트 모드: 주소 검색으로 근무지 등록 */}
                    <div>
                      <Label>근무지 (주소 검색)</Label>
                      {formClientId ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={testPlaceQuery} disabled className="flex-1" />
                          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={() => { setFormClientId(""); setTestPlaceQuery(""); setTestSearchResults([]); }}>변경</Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2 mt-1">
                            <Input placeholder="주소를 입력하세요 (예: 강남역)" value={testPlaceQuery} onChange={(e) => setTestPlaceQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTestSearch()} />
                            <Button type="button" size="sm" className="shrink-0" onClick={handleTestSearch} disabled={testSearching}>{testSearching ? "검색 중..." : "검색"}</Button>
                          </div>
                          {testSearchResults.length > 0 && (
                            <div className="mt-2 border rounded-md divide-y max-h-36 overflow-y-auto">
                              {testSearchResults.map((r, i) => (
                                <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={() => handleTestSelectAddress(r)}>{r.address}</button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {formClientId && (
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>시작 시간</Label><Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} /></div>
                        <div><Label>종료 시간</Label><Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} /></div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* 일반 모드: 캐스케이드 드롭다운 */}
                    <div>
                      <Label>고객사</Label>
                      <Select value={formClientId} onValueChange={handleClientSelect}>
                        <SelectTrigger><SelectValue placeholder="고객사를 선택하세요" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name} ({c.location})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {formClientId && selectedClientPostings.length > 0 && (
                      <div>
                        <Label>근무일 선택 (공고 기반)</Label>
                        <Select value={formDateKey} onValueChange={handleDateSelect}>
                          <SelectTrigger><SelectValue placeholder="공고 날짜를 선택하세요" /></SelectTrigger>
                          <SelectContent>
                            {selectedClientPostings.map((p) => (
                              <SelectItem key={`${p.workDate}|${p.startTime}|${p.endTime}|${p.postingId}`} value={`${p.workDate}|${p.startTime}|${p.endTime}|${p.postingId}`}>
                                {p.workDate} ({p.startTime.slice(0, 5)}~{p.endTime.slice(0, 5)})
                                {p.approvedMembers.length > 0 && ` · ${p.approvedMembers.length}명 승인`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formClientId && (
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>시작 시간</Label><Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} /></div>
                        <div><Label>종료 시간</Label><Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} /></div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* 알림 설정 */}
            {(formDateKey || editGroup || (testMode && formClientId) || (formClientId && formStartTime && formEndTime)) && (
              <>
                <Separator />
                <p className="text-sm font-medium">알림 설정</p>
                <div>
                  <Label>첫 알림 발송 시작</Label>
                  <Select value={String(alertMinutesBefore)} onValueChange={(v) => setAlertMinutesBefore(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALERT_TIME_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>첫 알림 메시지</Label>
                  <Input placeholder="출근 예정이신가요? (빈칸이면 기본 메시지)" value={customNotifyMessage} onChange={(e) => setCustomNotifyMessage(e.target.value)} />
                </div>
                <div>
                  <Label>미응답 시 재알림 주기</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="number" min={5} max={120} value={alertIntervalMinutes} onChange={(e) => setAlertIntervalMinutes(Number(e.target.value) || 15)} className="w-20" />
                    <span className="text-sm text-muted-foreground">분 마다 (최대 3회)</span>
                  </div>
                </div>
                <div>
                  <Label>재알림 메시지</Label>
                  <Input placeholder="아직 출근 확인이 안됐습니다 (빈칸이면 기본 메시지)" value={customRepeatMessage} onChange={(e) => setCustomRepeatMessage(e.target.value)} />
                </div>
              </>
            )}

            {/* 회원 선택 */}
            {(formDateKey || editGroup || (testMode && formClientId) || (formClientId && formStartTime && formEndTime)) && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between">
                    <Label>승인된 회원 ({selectedPostingMembers.length}명)</Label>
                    {selectedPostingMembers.length > 0 && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAllMembers}>전체선택</Button>
                    )}
                  </div>
                  {selectedPostingMembers.length > 0 ? (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                      {selectedPostingMembers.map((m) => (
                          <label key={m.id} className={cn("flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer")}>
                            <Checkbox checked={selectedMembers.includes(m.id)} onCheckedChange={() => toggleMember(m.id)} />
                            <span>{m.name ?? "이름없음"}</span>
                            <span className="text-muted-foreground">{m.phone}</span>
                          </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">승인된 지원자가 없습니다.</p>
                  )}
                </div>

                {/* 추가 검색 */}
                <div>
                  <Label>추가 회원 검색</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="이름 또는 전화번호 검색" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-9" />
                  </div>
                  {memberSearch && (
                    <div className="mt-2 max-h-36 overflow-y-auto rounded-md border p-2 space-y-1">
                      {filteredMembers.map((m) => (
                          <label key={m.id} className={cn("flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer")}>
                            <Checkbox checked={selectedMembers.includes(m.id)} onCheckedChange={() => toggleMember(m.id)} />
                            <span>{m.name ?? "이름없음"}</span>
                            <span className="text-muted-foreground">{m.phone}</span>
                          </label>
                      ))}
                      {filteredMembers.length === 0 && <p className="text-sm text-muted-foreground py-2 text-center">검색 결과가 없습니다</p>}
                    </div>
                  )}
                </div>

                {/* 엑셀 붙여넣기 */}
                <div>
                  <Label className="flex items-center gap-1.5"><ClipboardPaste className="h-3.5 w-3.5" />엑셀 붙여넣기</Label>
                  <Textarea placeholder={"이름\t전화번호 형식으로 붙여넣기\n예: 홍길동\t010-1234-5678"} value={pasteText} onChange={(e) => handlePaste(e.target.value)} className="mt-1 h-20 text-xs font-mono" />
                  {pasteResult && (
                    <div className="mt-1 text-xs space-x-3">
                      {pasteResult.matched.length > 0 && <span className="text-green-600">{pasteResult.matched.length}명 매칭</span>}
                      {pasteResult.unmatched.length > 0 && <span className="text-red-500">{pasteResult.unmatched.length}명 미등록</span>}
                    </div>
                  )}
                  {pasteResult?.unmatched && pasteResult.unmatched.length > 0 && (
                    <div className="mt-1 text-xs text-red-500">
                      {pasteResult.unmatched.map((u, i) => <div key={i}>· {u}</div>)}
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  총 <span className="font-semibold text-foreground">{selectedMembers.length}</span>명 선택됨
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !formClientId || selectedMembers.length === 0 || (!editGroup && !selectedWorkDate)}
            >
              {isPending ? (editGroup ? "저장 중..." : "등록 중...") : editGroup ? `${selectedMembers.length}명 저장` : `${selectedMembers.length}명 배정`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 배정 카드 그리드 ===== */}
      {shifts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">해당 날짜에 배정된 근무가 없습니다.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3">
          {groupedShifts.map(({ key, shifts: gs }) => {
            const f = gs[0];
            const arrivedN = gs.filter((s) => s.arrival_status === "arrived").length;
            const noshowN = gs.filter((s) => s.arrival_status === "noshow").length;
            const onN = gs.filter((s) => s.confirmed_at != null && s.arrival_status !== "arrived" && s.arrival_status !== "noshow").length;
            return (
              <SortableCard key={key} id={key}>
                <div className="p-4 pb-2 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">{f.clients.company_name}</p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setMapShifts(gs)} title="지도 보기"><MapIcon className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditDialog(gs)} title="수정"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" disabled={isPending} title="전체 삭제" onClick={() => { if (confirm(`${f.clients.company_name} ${f.start_time.slice(0,5)}~${f.end_time.slice(0,5)} 배정 ${gs.length}명을 모두 삭제하시겠습니까?`)) startTransition(async () => { const result = await deleteShiftGroup(gs.map(s => s.id)); if (result.error) alert(result.error); }); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{f.clients.location}</span></p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" /><span>{f.start_time.slice(0, 5)} ~ {f.end_time.slice(0, 5)}</span></p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[11px] px-1.5 py-0">총 {gs.length}명</Badge>
                    <Badge className="text-[11px] px-1.5 py-0 bg-green-600">ON {onN}</Badge>
                    <Badge className="text-[11px] px-1.5 py-0 bg-green-700">출근 {arrivedN}</Badge>
                    {noshowN > 0 && <Badge variant="destructive" className="text-[11px] px-1.5 py-0 bg-red-700">노쇼 {noshowN}</Badge>}
                  </div>
                </div>

                {/* FCM 발송 기록 + 즉시 발송 */}
                <ShiftCardFcm
                  memberIds={gs.map((s) => s.member_id)}
                  shiftIds={gs.map((s) => s.id)}
                  logs={notificationLogs}
                  isPending={isPending}
                  startTransition={startTransition}
                />

                {/* 회원 리스트 */}
                <div className="border-t divide-y">
                  {gs.map((shift) => {
                    const isNoshow = shift.arrival_status === "noshow";
                    const isArrived = shift.arrival_status === "arrived";
                    const isOn = shift.confirmed_at != null;
                    const departures = shift.departure_logs ?? [];
                    const activeDeparture = departures.find((d) => !d.returned_at);
                    const totalDepartMinutes = departures.reduce((sum, d) => sum + (d.duration_minutes ?? 0), 0);
                    return (
                      <div key={shift.id} className="px-4 py-2 text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{shift.members.name ?? "이름없음"}</span>
                              <span className="text-muted-foreground text-xs shrink-0">{shift.members.phone}</span>
                            </div>
                          </div>
                          {isNoshow ? (
                            <Badge variant="destructive" className="shrink-0 text-xs bg-red-700">노쇼</Badge>
                          ) : (
                            <>
                              <Badge variant={isOn ? "default" : "destructive"} className={cn("shrink-0 text-[11px] px-1.5", isOn ? "bg-green-600" : "bg-red-500")}>{isOn ? "ON" : "OFF"}</Badge>
                              {activeDeparture && <Badge variant="destructive" className="shrink-0 text-[11px] px-1.5 bg-orange-500 animate-pulse">이탈 중</Badge>}
                              {shift.approaching_at && <Badge variant="outline" className="shrink-0 text-[11px] px-1.5 border-purple-400 text-purple-700 bg-purple-50 tabular-nums">5km {fmtTime(shift.approaching_at)}</Badge>}
                              {shift.nearby_at && <Badge variant="outline" className="shrink-0 text-[11px] px-1.5 border-blue-400 text-blue-700 bg-blue-50 tabular-nums">2km {fmtTime(shift.nearby_at)}</Badge>}
                              {isArrived && shift.arrived_at && <Badge variant="outline" className="shrink-0 text-[11px] px-1.5 border-green-400 text-green-700 bg-green-50 tabular-nums">출근 {fmtTime(shift.arrived_at)}</Badge>}
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 shrink-0" onClick={() => handleDelete(shift.id)} disabled={isPending} title="삭제">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {departures.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-orange-600 pl-0.5">
                            <span>이탈 {departures.length}회</span>
                            {totalDepartMinutes > 0 && <span>총 {totalDepartMinutes}분</span>}
                            {departures.map((d, i) => (
                              <span key={d.id} className="text-muted-foreground">
                                {fmtTime(d.departed_at)}{d.returned_at ? `~${fmtTime(d.returned_at)}` : "~"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SortableCard>
            );
          })}
        </div>
        </SortableContext>
        </DndContext>
      )}

      <ShiftMapModal open={mapShifts !== null} onOpenChange={(o) => { if (!o) setMapShifts(null); }} shifts={mapShifts ?? []} />
    </div>
  );
}

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="rounded-lg border bg-card overflow-hidden">
      <div {...listeners} className="h-2 cursor-grab active:cursor-grabbing bg-muted/50 hover:bg-muted flex items-center justify-center">
        <div className="w-8 h-0.5 rounded-full bg-muted-foreground/30" />
      </div>
      {children}
    </div>
  );
}

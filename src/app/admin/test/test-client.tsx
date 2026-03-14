"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/app/admin/tracking/tracking-map";
import {
  createTestShift,
  deleteTestShift,
  getTestShifts,
  sendTestLocation,
  addTestMember,
  removeTestMember,
  getTestMembers,
} from "./actions";
import type { TestMember } from "./actions";
import type { DailyShiftWithDetails, ArrivalStatus } from "@/types/location";
import { MapPin, Trash2, Plus, User, Phone, Search, Navigation, Radio, UserPlus, Check } from "lucide-react";
import { TrackingMap } from "@/app/admin/tracking/tracking-map";

const statusBadgeVariant: Record<ArrivalStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  tracking: "bg-blue-100 text-blue-700",
  moving: "bg-blue-100 text-blue-700",
  offline: "bg-gray-100 text-gray-500",
  late_risk: "bg-orange-100 text-orange-700",
  noshow_risk: "bg-red-100 text-red-700",
  arrived: "bg-green-100 text-green-700",
  late: "bg-orange-100 text-orange-700",
  noshow: "bg-red-100 text-red-700",
};

interface AddressResult {
  address: string;
  lat: number;
  lng: number;
}

interface SlotInput {
  query: string;
  placeName: string;
  lat: number;
  lng: number;
  startTime: string;
  results: AddressResult[];
  searching: boolean;
}

function getDisplayStatus(shift: DailyShiftWithDetails, mounted: boolean): ArrivalStatus {
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

const defaultSlot = (): SlotInput => ({
  query: "",
  placeName: "",
  lat: 0,
  lng: 0,
  startTime: "09:00",
  results: [],
  searching: false,
});

export function TestClient({
  initialShifts,
  initialMembers,
}: {
  initialShifts: DailyShiftWithDetails[];
  initialMembers: TestMember[];
}) {
  const [shifts, setShifts] = useState(initialShifts);
  const [members, setMembers] = useState(initialMembers);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    initialMembers[0]?.id ?? ""
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 멤버 추가 폼
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const [slots, setSlots] = useState<SlotInput[]>([
    defaultSlot(),
    defaultSlot(),
    defaultSlot(),
  ]);
  const [loading, setLoading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sendingLocation, setSendingLocation] = useState<string | null>(null);
  const [autoSendId, setAutoSendId] = useState<string | null>(null);
  const autoSendRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const refreshShifts = async () => {
    const updated = await getTestShifts();
    setShifts(updated);
  };

  const refreshMembers = async () => {
    const updated = await getTestMembers();
    setMembers(updated);
  };

  const handleAddMember = async () => {
    const name = newName.trim();
    const phone = newPhone.trim().replace(/-/g, "");
    if (!name || !phone) return;

    setAddingMember(true);
    try {
      const member = await addTestMember(name, phone);
      await refreshMembers();
      setSelectedMemberId(member.id);
      setNewName("");
      setNewPhone("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "멤버 추가 실패");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("이 멤버의 오늘 배정을 모두 삭제하시겠습니까?")) return;
    setRemovingMember(memberId);
    try {
      await removeTestMember(memberId);
      await refreshShifts();
      if (selectedMemberId === memberId) {
        const remaining = members.filter((m) => m.id !== memberId);
        setSelectedMemberId(remaining[0]?.id ?? "");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setRemovingMember(null);
    }
  };

  const handleSearch = async (index: number) => {
    const query = slots[index].query.trim();
    if (!query) return;

    if (!window.google?.maps) {
      alert("지도가 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], searching: true, results: [] };
      return next;
    });

    try {
      const response = await geocoderRef.current.geocode({ address: query });
      const results: AddressResult[] = response.results.map((r) => ({
        address: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
      }));
      setSlots((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], results, searching: false };
        return next;
      });
    } catch (e) {
      console.error("Geocoding error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      alert(`주소 검색 실패: ${msg}`);
      setSlots((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], searching: false };
        return next;
      });
    }
  };

  const handleSelectAddress = (index: number, result: AddressResult) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        placeName: result.address,
        lat: result.lat,
        lng: result.lng,
        results: [],
        query: result.address,
      };
      return next;
    });
  };

  const handleAssign = async (index: number) => {
    const slot = slots[index];
    if (!slot.placeName || !slot.lat || !selectedMemberId) return;

    setLoading(index);
    try {
      const shiftId = await createTestShift(
        slot.placeName,
        slot.lat,
        slot.lng,
        slot.startTime,
        selectedMemberId
      );
      await refreshShifts();
      setSlots((prev) => {
        const next = [...prev];
        next[index] = defaultSlot();
        return next;
      });
      toggleAutoSend(shiftId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "배정 실패");
    } finally {
      setLoading(null);
    }
  };

  const handleSendLocation = async (shiftId: string) => {
    if (!navigator.geolocation) {
      alert("이 브라우저에서 위치 서비스를 지원하지 않습니다.");
      return;
    }
    setSendingLocation(shiftId);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      const result = await sendTestLocation(
        shiftId,
        pos.coords.latitude,
        pos.coords.longitude
      );
      await refreshShifts();
      if (result.arrived) {
        alert(`도착 확인! (${result.status === "late" ? "지각" : "정상"}, 거리: ${result.distance?.toFixed(1) ?? "?"}m)`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`위치 전송 실패: ${msg}`);
    } finally {
      setSendingLocation(null);
    }
  };

  const toggleAutoSend = (shiftId: string) => {
    if (autoSendId === shiftId) {
      if (autoSendRef.current) clearInterval(autoSendRef.current);
      autoSendRef.current = null;
      setAutoSendId(null);
    } else {
      if (autoSendRef.current) clearInterval(autoSendRef.current);
      setAutoSendId(shiftId);
      handleSendLocation(shiftId);
      autoSendRef.current = setInterval(() => {
        handleSendLocation(shiftId);
      }, 60_000);
    }
  };

  useEffect(() => {
    return () => {
      if (autoSendRef.current) clearInterval(autoSendRef.current);
    };
  }, []);

  const handleDelete = async (shiftId: string) => {
    if (!confirm("이 배정을 삭제하시겠습니까?")) return;
    setDeleting(shiftId);
    try {
      await deleteTestShift(shiftId);
      await refreshShifts();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeleting(null);
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const formatPhone = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* 테스트 멤버 관리 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>테스트 멤버</span>
            <Badge variant="secondary">{members.length}명</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 멤버 목록 */}
          <div className="space-y-2">
            {members.map((member) => (
              <button
                key={member.id}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selectedMemberId === member.id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedMemberId(member.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      selectedMemberId === member.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {selectedMemberId === member.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPhone(member.phone)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMember(member.id);
                  }}
                  disabled={removingMember === member.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </button>
            ))}
            {members.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                등록된 테스트 멤버가 없습니다.
              </p>
            )}
          </div>

          {/* 멤버 추가 폼 */}
          <div className="flex items-end gap-2 rounded-lg border border-dashed p-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">이름</label>
              <Input
                placeholder="홍길동"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">전화번호</label>
              <Input
                placeholder="01012345678"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddMember}
              disabled={!newName.trim() || !newPhone.trim() || addingMember}
              className="h-9"
            >
              <UserPlus className="mr-1 h-4 w-4" />
              {addingMember ? "추가중..." : "추가"}
            </Button>
          </div>

          {selectedMember && (
            <p className="text-xs text-blue-600">
              선택된 멤버: <span className="font-medium">{selectedMember.name}</span> — 아래에서 근무지를 배정하면 이 멤버에게 배정됩니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 근무지 검색 + 배정 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">근무지 검색 + 배정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {slots.map((slot, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border p-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  근무지 {i + 1} - 주소 검색
                </label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="주소를 입력하세요 (예: 강남역, 서울시 강남구...)"
                      value={slot.query}
                      onChange={(e) =>
                        setSlots((prev) => {
                          const next = [...prev];
                          next[i] = {
                            ...next[i],
                            query: e.target.value,
                            placeName: "",
                            lat: 0,
                            lng: 0,
                          };
                          return next;
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch(i);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(i)}
                      disabled={!slot.query.trim() || slot.searching}
                    >
                      <Search className="mr-1 h-4 w-4" />
                      {slot.searching ? "검색중..." : "검색"}
                    </Button>
                  </div>
                  {/* 검색 결과 드롭다운 */}
                  {slot.results.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
                      {slot.results.map((r, ri) => (
                        <button
                          key={ri}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => handleSelectAddress(i, r)}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{r.address}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {slot.placeName && (
                  <p className="flex items-center gap-1 text-xs text-green-600">
                    <MapPin className="h-3 w-3" />
                    {slot.lat.toFixed(5)}, {slot.lng.toFixed(5)}
                  </p>
                )}
              </div>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    출근 시간
                  </label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      setSlots((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], startTime: e.target.value };
                        return next;
                      })
                    }
                    className="w-28"
                  />
                </div>
                <Button
                  onClick={() => handleAssign(i)}
                  disabled={!slot.placeName || !selectedMemberId || loading === i}
                  size="sm"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {loading === i ? "배정중..." : selectedMember ? `${selectedMember.name} 배정` : "배정"}
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            * 동일 회원은 하루에 1개 배정만 가능합니다 (unique constraint). 새
            배정 시 기존 배정이 업데이트됩니다.
          </p>
        </CardContent>
      </Card>

      {/* 기존 배정 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>오늘 배정 목록</span>
            <Badge variant="secondary">{shifts.length}건</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              오늘 배정된 근무가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        {shift.members?.name ?? "알 수 없음"}
                      </Badge>
                      <span className="font-medium text-sm">
                        {shift.clients.company_name}
                      </span>
                      {(() => {
                        const displayStatus = getDisplayStatus(shift, mounted);
                        return (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeVariant[displayStatus]}`}
                          >
                            {statusLabels[displayStatus]}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      출근: {shift.start_time.slice(0, 5)}
                      {shift.clients.latitude && (
                        <span className="ml-2">
                          ({shift.clients.latitude.toFixed(4)},{" "}
                          {shift.clients.longitude?.toFixed(4)})
                        </span>
                      )}
                    </p>
                    {shift.last_seen_at && (
                      <p className="text-xs text-blue-600">
                        최근 위치:{" "}
                        {new Date(shift.last_seen_at).toLocaleTimeString(
                          "ko-KR",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSendLocation(shift.id)}
                      disabled={sendingLocation === shift.id}
                    >
                      <Navigation className="mr-1 h-3.5 w-3.5" />
                      {sendingLocation === shift.id ? "전송중..." : "내 위치"}
                    </Button>
                    <Button
                      variant={autoSendId === shift.id ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs ${autoSendId === shift.id ? "bg-green-600 hover:bg-green-700" : ""}`}
                      onClick={() => toggleAutoSend(shift.id)}
                    >
                      <Radio className="mr-1 h-3.5 w-3.5" />
                      {autoSendId === shift.id ? "자동 ON" : "자동"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(shift.id)}
                      disabled={deleting === shift.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 트래킹 맵 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">실시간 트래킹 맵</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingMap shifts={shifts} />
        </CardContent>
      </Card>
    </div>
  );
}

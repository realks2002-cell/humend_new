"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShiftTable, type ShiftWithDetails, type NotificationLog } from "../shifts/shift-table";
import {
  addTestMember,
  removeTestMember,
  cleanupTestClients,
  resetTestShifts,
  diagnosePushStatus,
  sendTestPushToMember,
  triggerCron,
  createTestClient,
} from "./actions";
import type { TestMember, PushDiagnosis } from "./actions";
import {
  Plus,
  Trash2,
  Search,
  BellRing,
  RotateCcw,
  Play,
  MapPin,
} from "lucide-react";

interface TestClient {
  id: string;
  company_name: string;
  location: string;
}

export function TestToolbar({
  testClients,
  testMembers,
}: {
  testClients: TestClient[];
  testMembers: TestMember[];
}) {
  const router = useRouter();

  // 근무지 추가
  const [placeQuery, setPlaceQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ address: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // 테스터 추가
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // 도구
  const [cronTriggering, setCronTriggering] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  // 푸시 진단
  const [pushDiagnosis, setPushDiagnosis] = useState<PushDiagnosis | null>(null);
  const [diagnosingPush, setDiagnosingPush] = useState<string | null>(null);
  const [sendingTestPush, setSendingTestPush] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!placeQuery.trim()) return;
    if (!window.google?.maps) {
      alert("지도가 아직 로딩 중입니다.");
      return;
    }
    if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();
    setSearching(true);
    try {
      const response = await geocoderRef.current.geocode({ address: placeQuery });
      const results = response.results.map((r) => ({
        address: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
      }));
      setSearchResults(results);
    } catch {
      alert("주소 검색 실패");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAddress = async (r: { address: string; lat: number; lng: number }) => {
    setAddingClient(true);
    try {
      await createTestClient(r.address, r.lat, r.lng);
      setSearchResults([]);
      setPlaceQuery("");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setAddingClient(false);
    }
  };

  const handleAddMember = async () => {
    const name = newName.trim();
    const phone = newPhone.trim().replace(/-/g, "");
    if (!name || !phone) return;
    setAddingMember(true);
    try {
      await addTestMember(name, phone);
      setNewName("");
      setNewPhone("");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setAddingMember(false);
    }
  };

  const handleTriggerCron = async () => {
    setCronTriggering(true);
    setCronResult(null);
    try {
      const result = await triggerCron();
      setCronResult(`체크: ${result.checked}건, 발송: ${result.notified}건`);
      router.refresh();
    } catch {
      setCronResult("cron 실행 실패");
    } finally {
      setCronTriggering(false);
    }
  };

  const handleDiagnose = async (memberId: string) => {
    setDiagnosingPush(memberId);
    try {
      setPushDiagnosis(await diagnosePushStatus(memberId));
    } catch {
      alert("진단 실패");
    } finally {
      setDiagnosingPush(null);
    }
  };

  const handleTestPush = async (memberId: string) => {
    setSendingTestPush(memberId);
    try {
      const result = await sendTestPushToMember(memberId);
      if (result.noTokens) alert("FCM 토큰 없음 — 앱에서 알림 허용 필요");
      else alert(`발송: ${result.sent}, 실패: ${result.failed}`);
    } catch {
      alert("발송 실패");
    } finally {
      setSendingTestPush(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 테스트 근무지 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            테스트 근무지 ({testClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {testClients.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs p-1.5 rounded border">
              <span className="flex-1 truncate">{c.company_name}</span>
            </div>
          ))}
          <Separator />
          <div className="flex gap-1.5">
            <Input
              placeholder="주소 검색 (예: 강남역)"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-7 text-xs"
            />
            <Button size="sm" className="h-7 px-2 shrink-0" onClick={handleSearch} disabled={searching}>
              <Search className="h-3 w-3" />
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="border rounded divide-y max-h-32 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent"
                  onClick={() => handleSelectAddress(r)}
                  disabled={addingClient}
                >
                  {r.address}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 테스터 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BellRing className="h-4 w-4" />
            테스터 ({testMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {testMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-1.5 text-xs p-1.5 rounded border">
              <span className="flex-1 truncate">{m.name} · {m.phone}</span>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleDiagnose(m.id)} disabled={diagnosingPush === m.id}>
                <Search className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleTestPush(m.id)} disabled={sendingTestPush === m.id}>
                <BellRing className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-red-500"
                onClick={async () => {
                  await removeTestMember(m.id);
                  router.refresh();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {pushDiagnosis && (
            <div className="p-2 rounded bg-muted text-[11px] space-y-0.5">
              <p className="font-semibold">{pushDiagnosis.memberName}</p>
              <p>토큰: {pushDiagnosis.tokenCount > 0 ? <span className="text-green-600">{pushDiagnosis.tokenCount}개</span> : <span className="text-red-500">없음</span>}</p>
              <Button size="sm" variant="ghost" className="h-5 text-[11px] px-1" onClick={() => setPushDiagnosis(null)}>닫기</Button>
            </div>
          )}
          <Separator />
          <div className="flex gap-1.5">
            <Input placeholder="이름" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-7 text-xs" />
            <Input placeholder="전화번호" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-7 text-xs" />
            <Button size="sm" className="h-7 px-2 shrink-0" onClick={handleAddMember} disabled={addingMember}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 도구 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">도구</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-1.5 h-8 text-xs"
            onClick={handleTriggerCron}
            disabled={cronTriggering}
          >
            <Play className="h-3.5 w-3.5" />
            {cronTriggering ? "실행 중..." : "수동 Cron 실행"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-1.5 h-8 text-xs"
            onClick={async () => {
              setResetting(true);
              await resetTestShifts();
              router.refresh();
              setResetting(false);
            }}
            disabled={resetting}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resetting ? "초기화 중..." : "배정 초기화 (pending)"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-1.5 h-8 text-xs text-red-500"
            onClick={async () => {
              if (!confirm("테스트 근무지와 배정을 모두 삭제합니까?")) return;
              setCleaningUp(true);
              await cleanupTestClients();
              router.refresh();
              setCleaningUp(false);
            }}
            disabled={cleaningUp}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {cleaningUp ? "삭제 중..." : "테스트 데이터 전체 삭제"}
          </Button>
          {cronResult && (
            <p className="text-[11px] text-muted-foreground bg-muted p-1.5 rounded">{cronResult}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ShiftTable wrapper — testMode + onCreateTestClient 전달
interface TestShiftTableProps {
  shifts: ShiftWithDetails[];
  clients: { id: string; company_name: string; location: string }[];
  members: { id: string; name: string | null; phone: string }[];
  selectedDate: string;
  assignedMemberIds: string[];
  notificationLogs: NotificationLog[];
}

export function TestShiftTable(props: TestShiftTableProps) {
  const handleCreateTestClient = async (placeName: string, lat: number, lng: number) => {
    return await createTestClient(placeName, lat, lng);
  };

  return (
    <ShiftTable
      {...props}
      approvedPostings={[]}
      clientPostings={[]}
      testMode
      onCreateTestClient={handleCreateTestClient}
    />
  );
}

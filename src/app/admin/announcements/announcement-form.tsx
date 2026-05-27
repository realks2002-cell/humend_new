"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone, Plus, X, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

type Member = { id: string; name: string | null; phone: string };

const FONT_OPTIONS = [
  { value: "14", label: "작게 (14px)" },
  { value: "16", label: "보통 (16px)" },
  { value: "18", label: "크게 (18px)" },
  { value: "20", label: "더 크게 (20px)" },
  { value: "24", label: "아주 크게 (24px)" },
];

const EXPIRY_OPTIONS = [
  { value: "never", label: "무기한" },
  { value: "7", label: "7일 후" },
  { value: "30", label: "30일 후" },
];

function expiryToISO(value: string): string {
  if (value === "never") return "";
  const days = Number(value);
  if (!Number.isFinite(days)) return "";
  return new Date(Date.now() + days * 86400000).toISOString();
}

export default function AnnouncementForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fontSize, setFontSize] = useState("16");
  const [expiry, setExpiry] = useState("never");
  const [target, setTarget] = useState<"all" | "users">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Member[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [notFound, setNotFound] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!search) return [];
    return members
      .filter((m) => m.name?.includes(search) || m.phone.includes(search))
      .slice(0, 10);
  }, [search, members]);

  // 전화번호(숫자만) → 회원 매핑
  const phoneMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) {
      const digits = m.phone.replace(/\D/g, "");
      if (digits) map.set(digits, m);
    }
    return map;
  }, [members]);

  function toggleMember(m: Member) {
    setSelected((prev) =>
      prev.some((x) => x.id === m.id)
        ? prev.filter((x) => x.id !== m.id)
        : [...prev, m]
    );
  }

  // 엑셀 등에서 붙여넣은 전화번호 목록 일괄 추가
  function handleBulkAdd() {
    const tokens = bulkText.split(/[\s,;|]+/).map((s) => s.trim()).filter(Boolean);
    if (tokens.length === 0) return;

    const seen = new Set(selected.map((m) => m.id));
    const added: Member[] = [];
    const missing: string[] = [];

    for (const tok of tokens) {
      const d = tok.replace(/\D/g, "");
      if (!d) continue;
      // 정확 일치 → 엑셀에서 앞 0 누락(예: 1012345678) 보정
      const m = phoneMap.get(d) ?? phoneMap.get("0" + d);
      if (m) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          added.push(m);
        }
      } else {
        missing.push(tok);
      }
    }

    if (added.length > 0) setSelected((prev) => [...prev, ...added]);
    setNotFound(missing);
    setBulkText("");
    toast.success(
      `${added.length}명 추가됨` + (missing.length > 0 ? `, ${missing.length}건 미매칭` : "")
    );
  }

  function reset() {
    setTitle("");
    setBody("");
    setFontSize("16");
    setExpiry("never");
    setTarget("all");
    setSearch("");
    setSelected([]);
    setBulkText("");
    setNotFound([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }
    if (target === "users" && selected.length === 0) {
      toast.error("대상 회원을 1명 이상 선택해주세요.");
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("font_size", fontSize);
    fd.set("target_type", target);
    fd.set("expires_at", expiryToISO(expiry));
    fd.set("user_ids", JSON.stringify(selected.map((m) => m.id)));

    const result = await createAnnouncement(fd);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("공지가 등록되었습니다.");
      reset();
      setOpen(false);
      router.refresh();
    }
  }

  const fontPx = Number(fontSize);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#091413]">
            <Megaphone className="h-5 w-5 text-[#273F4F]" />
            인앱 공지
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            앱을 열 때 표시되는 공지 팝업을 관리합니다. 글씨 크기를 자유롭게 설정할 수 있습니다.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 bg-[#273F4F] text-white hover:bg-[#1e2f3a]"
        >
          <Plus className="h-4 w-4" />
          공지 작성
        </Button>
      </div>

      {/* 작성 폼 */}
      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[5px] border border-[#D7D7D7] bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-[#091413]">새 공지 작성</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#091413]">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#091413]">내용</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              rows={5}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#091413]">글씨 크기</label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#091413]">만료</label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 발송 대상 토글 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#091413]">발송 대상</label>
            <div className="flex gap-2">
              {([
                { key: "all", label: "전체" },
                { key: "users", label: "개별 선택" },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTarget(opt.key)}
                  className={`rounded-[5px] border px-4 py-1.5 text-sm font-medium transition-colors ${
                    target === opt.key
                      ? "border-[#273F4F] bg-[#273F4F] text-white"
                      : "border-[#D7D7D7] bg-white text-[#091413] hover:bg-[#F5F5F5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 개별 선택 */}
          {target === "users" && (
            <div className="space-y-3 rounded-[5px] border border-[#D7D7D7] bg-[#F5F5F5] p-3">
              {/* 전화번호 엑셀 일괄 붙여넣기 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#4B5563]">
                  전화번호 일괄 붙여넣기
                  <span className="ml-1 font-normal text-[#9CA3AF]">(엑셀에서 복사 · 줄바꿈/쉼표/탭 구분)</span>
                </label>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"010-1234-5678\n010-2345-6789\n010-3456-7890"}
                  rows={3}
                  className="bg-white font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleBulkAdd}
                  disabled={!bulkText.trim()}
                  className="border-[#D7D7D7] bg-white text-[#091413] hover:bg-[#F5F5F5]"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  번호 일괄 추가
                </Button>
                {notFound.length > 0 && (
                  <p className="rounded-[5px] bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                    매칭 실패 {notFound.length}건:{" "}
                    <span className="font-mono break-all">{notFound.join(", ")}</span>
                  </p>
                )}
              </div>

              <div className="border-t border-[#D7D7D7]" />

              {/* 이름/번호로 개별 검색 */}
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 또는 전화번호로 검색"
                className="bg-white"
              />
              {search && filtered.length > 0 && (
                <div className="max-h-44 overflow-y-auto rounded-[5px] border border-[#D7D7D7] bg-white">
                  {filtered.map((m) => {
                    const checked = selected.some((x) => x.id === m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F5F5F5]"
                      >
                        <Checkbox checked={checked} className="pointer-events-none" />
                        <span className="font-medium text-[#091413]">{m.name ?? "(이름없음)"}</span>
                        <span className="font-mono text-[#6B7280]">{m.phone}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {search && filtered.length === 0 && (
                <p className="text-xs text-[#9CA3AF]">검색 결과가 없습니다.</p>
              )}

              {/* 선택된 회원 */}
              {selected.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#4B5563]">
                      선택 {selected.length}명
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected([])}
                      className="text-xs text-[#6B7280] hover:text-red-600"
                    >
                      전체 해제
                    </button>
                  </div>
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                    {selected.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 rounded-full bg-[#273F4F] px-2.5 py-0.5 text-xs text-white"
                      >
                        {m.name ?? m.phone}
                        <button type="button" onClick={() => toggleMember(m)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 미리보기 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#091413]">미리보기</label>
            <div className="w-full max-w-sm overflow-hidden rounded-[8px] border border-[#D7D7D7] bg-white shadow-sm">
              <div className="flex items-center gap-2 bg-[#273F4F] px-4 py-3 text-white">
                <Megaphone className="h-4 w-4" />
                <span className="text-sm font-semibold">공지사항</span>
              </div>
              <div className="space-y-2 p-4">
                <p className="font-semibold text-[#091413]">{title || "제목"}</p>
                <p
                  className="whitespace-pre-wrap break-words text-[#4B5563]"
                  style={{ fontSize: `${fontPx}px` }}
                >
                  {body || "내용이 여기에 표시됩니다."}
                </p>
                <button
                  type="button"
                  className="mt-1 w-full rounded-[5px] bg-[#273F4F] py-2 text-sm font-medium text-white"
                >
                  확인
                </button>
              </div>
            </div>
          </div>

          {/* 액션 */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="border-[#D7D7D7] bg-[#F5F5F5] text-[#091413] hover:bg-[#ECECEC]"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#273F4F] text-white hover:bg-[#1e2f3a]"
            >
              {loading ? "등록 중..." : "공지 등록"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

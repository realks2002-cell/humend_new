"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendNotification } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  members: Array<{ id: string; name: string | null; phone: string }>;
  clients: Array<{ id: string; company_name: string }>;
}

export default function NotificationForm({ members, clients }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"all" | "individual" | "client">("all");
  const [memberId, setMemberId] = useState("");
  const [clientId, setClientId] = useState("");
  const [search, setSearch] = useState("");

  const filtered = search
    ? members.filter(
        (m) =>
          m.name?.includes(search) || m.phone.includes(search)
      )
    : [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (target === "individual" && memberId) {
      formData.set("target_member_id", memberId);
    }
    if (target === "client" && clientId) {
      formData.set("target_client_id", clientId);
    }

    const result = await sendNotification(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`알림이 발송되었습니다 (${result.sent}건)`);
      (e.target as HTMLFormElement).reset();
      setMemberId("");
      setClientId("");
      setSearch("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">알림 발송</h2>

      <div>
        <label className="mb-1 block text-sm font-medium">제목</label>
        <Input name="title" placeholder="알림 제목" required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">내용</label>
        <Textarea name="body" placeholder="알림 내용" rows={3} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">대상</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              checked={target === "all"}
              onChange={() => {
                setTarget("all");
                setMemberId("");
                setClientId("");
              }}
            />
            전체 회원
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              checked={target === "individual"}
              onChange={() => {
                setTarget("individual");
                setClientId("");
              }}
            />
            특정 회원
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              checked={target === "client"}
              onChange={() => {
                setTarget("client");
                setMemberId("");
              }}
            />
            고객사 경력 회원
          </label>
        </div>
      </div>

      {target === "individual" && (
        <div className="space-y-2">
          <Input
            placeholder="이름 또는 전화번호 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {memberId && (
            <p className="text-sm text-blue-600">
              선택됨: {members.find((m) => m.id === memberId)?.name ?? ""} (
              {members.find((m) => m.id === memberId)?.phone})
            </p>
          )}
          {search && filtered.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded border">
              {filtered.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                  onClick={() => {
                    setMemberId(m.id);
                    setSearch("");
                  }}
                >
                  <span className="font-medium">{m.name ?? "(이름없음)"}</span>
                  <span className="text-muted-foreground">{m.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {target === "client" && (
        <div>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">고객사 선택</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || (target === "individual" && !memberId) || (target === "client" && !clientId)}
        className="w-full"
      >
        {loading ? "발송 중..." : "알림 발송"}
      </Button>
    </form>
  );
}

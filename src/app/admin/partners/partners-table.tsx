"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateInquiryStatus } from "./actions";

interface Inquiry {
  id: string;
  company_name: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "대기", variant: "default" },
  contacted: { label: "연락완료", variant: "secondary" },
  closed: { label: "종료", variant: "outline" },
};

export function PartnersTable({ inquiries }: { inquiries: Inquiry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      const result = await updateInquiryStatus(id, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("상태가 변경되었습니다.");
      }
    });
  }

  if (inquiries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        접수된 문의가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">회사명</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">담당자</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">연락처</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">이메일</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">상태</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">접수일</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">문의내용</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {inquiries.map((inq) => {
            const cfg = statusConfig[inq.status] ?? statusConfig.pending;
            return (
              <tr key={inq.id} className="hover:bg-muted/30 transition-colors">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{inq.company_name}</td>
                <td className="whitespace-nowrap px-4 py-3">{inq.contact_person}</td>
                <td className="whitespace-nowrap px-4 py-3">{inq.contact_phone}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {inq.contact_email || "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Select
                    defaultValue={inq.status}
                    onValueChange={(value) => handleStatusChange(inq.id, value)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-8 w-[120px]">
                      <SelectValue>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="contacted">연락완료</SelectItem>
                      <SelectItem value="closed">종료</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(inq.created_at).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-3">
                  {inq.message ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                    >
                      {expandedId === inq.id ? "닫기" : "보기"}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Expanded message area */}
      {expandedId && (() => {
        const inq = inquiries.find((i) => i.id === expandedId);
        if (!inq?.message) return null;
        return (
          <div className="border-t bg-muted/20 px-6 py-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {inq.company_name} 문의내용
            </p>
            <p className="whitespace-pre-wrap text-sm">{inq.message}</p>
          </div>
        );
      })()}
    </div>
  );
}

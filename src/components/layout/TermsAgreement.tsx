"use client";

import { useState, useEffect } from "react";
import { Check, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "terms_agreed_v1";

const terms = [
  { id: "service", label: "[필수] 이용약관 동의", href: "/terms", required: true },
  { id: "privacy", label: "[필수] 개인정보 처리방침 동의", href: "/privacy", required: true },
  { id: "location", label: "[필수] 위치정보 수집·이용 동의", href: "/my/location-consent", required: true, desc: "출근 확인을 위해 배정된 근무일에 근무지 도착 여부를 확인합니다. 15일 후 자동 삭제됩니다." },
  { id: "push", label: "[필수] 알림 수신 동의", required: true, desc: "근무 배정, 출근 안내, 급여 확정 등 주요 알림을 푸시로 받습니다." },
];

export default function TermsAgreement({ children }: { children: React.ReactNode }) {
  const [agreed, setAgreed] = useState<boolean | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = terms.every((t) => checked[t.id]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setAgreed(stored === "true");
  }, []);

  if (agreed === null) return null;
  if (agreed) return <>{children}</>;

  const handleToggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleAll = () => {
    if (allChecked) {
      setChecked({});
    } else {
      const all: Record<string, boolean> = {};
      terms.forEach((t) => { all[t.id] = true; });
      setChecked(all);
    }
  };

  const handleAgree = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setAgreed(true);
  };

  return (
    <div className="fixed inset-0 z-[99998] flex flex-col bg-white" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-32">
        <img src="/logo.png" alt="HUMAN:D" className="h-5 w-auto mb-8" />
        <h1 className="text-2xl font-bold mb-2">서비스 이용 동의</h1>
        <p className="text-sm text-muted-foreground mb-8">
          HUMAN:D를 이용하려면 아래 약관에 동의해주세요.
        </p>

        {/* 전체 동의 */}
        <button
          onClick={handleToggleAll}
          className="flex w-full items-center gap-3 rounded-xl border-2 p-4 mb-4 transition-colors"
          style={{ borderColor: allChecked ? "#830020" : "#e5e7eb" }}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: allChecked ? "#830020" : "#e5e7eb" }}
          >
            <Check className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base">전체 동의</span>
        </button>

        {/* 개별 약관 */}
        <div className="space-y-1">
          {terms.map((term) => (
            <div key={term.id}>
              <div className="flex items-center gap-3 py-3">
                <button
                  onClick={() => handleToggle(term.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{ background: checked[term.id] ? "#830020" : "#d1d5db" }}
                >
                  <Check className="h-3 w-3 text-white" />
                </button>
                <button
                  onClick={() => handleToggle(term.id)}
                  className="flex-1 text-left text-sm font-medium"
                >
                  {term.label}
                </button>
                {term.href && (
                  <a
                    href={term.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </a>
                )}
              </div>
              {term.desc && (
                <p className="text-xs text-muted-foreground ml-8 -mt-1 mb-1">{term.desc}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 동의 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        <Button
          className="w-full h-12 text-base font-bold rounded-xl"
          disabled={!allChecked}
          onClick={handleAgree}
          style={{ background: allChecked ? "#830020" : undefined }}
        >
          동의하고 시작하기
        </Button>
      </div>
    </div>
  );
}

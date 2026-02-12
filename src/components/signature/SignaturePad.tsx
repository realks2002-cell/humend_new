"use client";

import { useRef, useEffect } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface Props {
  onSave: (dataUrl: string) => void;
  loading?: boolean;
}

export function SignaturePad({ onSave, loading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 고해상도 디스플레이 대응
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);

    padRef.current = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    });

    return () => {
      padRef.current?.off();
    };
  }, []);

  function handleClear() {
    padRef.current?.clear();
  }

  function handleSave() {
    if (!padRef.current || padRef.current.isEmpty()) {
      alert("서명을 입력해주세요.");
      return;
    }
    const dataUrl = padRef.current.toDataURL("image/png");
    onSave(dataUrl);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white">
        <canvas
          ref={canvasRef}
          className="h-48 w-full cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={loading}
        >
          <Eraser className="mr-1 h-3 w-3" />
          지우기
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "저장 중..." : "서명 완료"}
        </Button>
      </div>
    </div>
  );
}

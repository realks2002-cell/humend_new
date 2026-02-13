"use client";

import { useState, useRef } from "react";
import { X, ImagePlus, Loader2 } from "lucide-react";

function compressToDataURL(file: File, maxWidth = 1200, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = url;
  });
}

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  pendingDataUrls: string[];
  onPendingChange: (dataUrls: string[]) => void;
  maxCount?: number;
}

export function ImageUpload({ value, onChange, pendingDataUrls, onPendingChange, maxCount = 3 }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  const totalCount = value.length + pendingDataUrls.length;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (totalCount >= maxCount) return;

    setCompressing(true);
    try {
      const dataUrl = await compressToDataURL(file);
      onPendingChange([...pendingDataUrls, dataUrl]);
    } catch (err) {
      console.error("압축 실패:", err);
    } finally {
      setCompressing(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveExisting = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleRemovePending = (index: number) => {
    onPendingChange(pendingDataUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {/* 기존 업로드된 사진 */}
        {value.map((url, i) => (
          <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
            <img src={url} alt={`사진 ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemoveExisting(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {/* 새로 추가된 사진 (미리보기) */}
        {pendingDataUrls.map((dataUrl, i) => (
          <div key={`pending-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-md border border-blue-300 bg-muted">
            <img src={dataUrl} alt={`새 사진 ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemovePending(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="absolute bottom-1 left-1 rounded bg-blue-500 px-1 py-0.5 text-[10px] text-white">
              저장 시 업로드
            </div>
          </div>
        ))}
        {/* 추가 버튼 */}
        {totalCount < maxCount && (
          <button
            type="button"
            disabled={compressing}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[4/3] items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
          >
            {compressing ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
      <p className="text-xs text-muted-foreground">
        최대 {maxCount}장 (하나씩 추가, 저장 시 업로드)
      </p>
    </div>
  );
}

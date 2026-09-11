"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, ImageIcon, Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadFamilyCert } from "./actions";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;

interface FamilyCertClientProps {
  initialUrl: string | null;
  initialUploadedAt: string | null;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

async function compress(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2400,
      useWebWorker: true,
      initialQuality: 0.9,
    });
  } catch {
    return file;
  }
}

export function FamilyCertClient({ initialUrl, initialUploadedAt }: FamilyCertClientProps) {
  const [cert, setCert] = useState(
    initialUploadedAt ? { url: initialUrl, uploadedAt: initialUploadedAt } : null,
  );
  const [editing, setEditing] = useState(!initialUploadedAt);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function resetSelection() {
    setFile(null);
    setPreview(null);
  }

  async function handleUpload() {
    if (!file) {
      toast.error("가족관계증명서 사진을 선택해 주세요.");
      return;
    }
    setUploading(true);
    try {
      const uploadFile = await compress(file);
      if (uploadFile.size > MAX_UPLOAD_SIZE) {
        toast.error("사진 용량이 너무 커요. 다른 사진을 선택해 주세요.");
        return;
      }
      const formData = new FormData();
      formData.append("file", uploadFile, uploadFile.name || file.name);
      const result = await uploadFamilyCert(formData);
      if (result.error) {
        toast.error("업로드 실패", { description: result.error });
        return;
      }
      toast.success("업로드가 완료되었습니다.", { duration: 1000 });
      setCert({ url: result.url ?? null, uploadedAt: result.uploadedAt ?? new Date().toISOString() });
      setEditing(false);
      resetSelection();
    } catch {
      toast.error("업로드 실패", { description: "잠시 후 다시 시도해 주세요." });
    } finally {
      setUploading(false);
    }
  }

  if (cert && !editing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">가족관계증명서 업로드 완료</p>
            <p className="text-xs text-emerald-600">{formatDate(cert.uploadedAt)} 업로드됨</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-center">가족관계증명서</h1>

        <Card className="overflow-hidden py-0">
          <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
            ■ 업로드한 가족관계증명서
          </div>
          <CardContent className="p-5">
            {cert.url ? (
              <div className="rounded-lg border overflow-hidden bg-white">
                <img src={cert.url} alt="가족관계증명서" className="w-full max-h-[32rem] object-contain" />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                사진을 불러오지 못했어요. 화면을 새로고침해 주세요.
              </p>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          다시 올리기
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-center">가족관계증명서</h1>
      <p className="text-center text-sm text-muted-foreground">
        미성년자 근로를 위해 보호자와의 관계를 확인할 수 있는 가족관계증명서를 올려 주세요.
      </p>

      <Card className="overflow-hidden py-0">
        <div className="bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white">
          ■ 가족관계증명서 사진
        </div>
        <CardContent className="space-y-3 p-5">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={albumRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {preview ? (
            <div className="rounded-lg border overflow-hidden bg-white">
              <img src={preview} alt="가족관계증명서 미리보기" className="w-full max-h-80 object-contain" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => albumRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-10 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
            >
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  가족관계증명서 사진을 올려 주세요
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">JPG, PNG, HEIC (최대 10MB)</p>
              </div>
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={uploading}>
              <Camera className="mr-2 h-4 w-4" />
              사진 촬영
            </Button>
            <Button variant="outline" size="sm" onClick={() => albumRef.current?.click()} disabled={uploading}>
              <ImageIcon className="mr-2 h-4 w-4" />
              {preview ? "다른 사진 선택" : "앨범에서 선택"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            업로드 중...
          </>
        ) : (
          "업로드"
        )}
      </Button>

      {cert && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            resetSelection();
            setEditing(false);
          }}
          disabled={uploading}
        >
          취소
        </Button>
      )}
    </div>
  );
}

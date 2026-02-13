"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { X, ImagePlus, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { uploadClientImage } from "@/app/admin/clients/upload-action";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxCount?: number;
}

export function ImageUpload({ value, onChange, maxCount = 3 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = maxCount - value.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);

    try {
      const uploaded: string[] = [];

      for (const file of toUpload) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        });

        const formData = new FormData();
        formData.append("file", compressed);

        const result = await uploadClientImage(formData);

        if (result.error) {
          console.error("Upload error:", result.error);
          continue;
        }

        if (result.url) {
          uploaded.push(result.url);
        }
      }

      onChange([...value, ...uploaded]);
    } catch (err) {
      console.error("Image upload failed:", err);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
            <Image src={url} alt={`사진 ${i + 1}`} fill className="object-cover" sizes="200px" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < maxCount && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[4/3] items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
          >
            {uploading ? (
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
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <p className="text-xs text-muted-foreground">
        최대 {maxCount}장 (클릭하여 추가)
      </p>
    </div>
  );
}

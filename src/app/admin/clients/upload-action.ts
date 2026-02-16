"use server";

import { put } from "@vercel/blob";

export async function uploadClientImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { error: "파일이 없습니다.", url: null };

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `client-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const blob = await put(filePath, buffer, {
    access: "public",
    contentType: file.type || "image/jpeg",
    addRandomSuffix: false,
  });

  return { url: blob.url, error: null };
}

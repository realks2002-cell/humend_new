import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "family-certs";
const MAX_SIZE = 10 * 1024 * 1024;
const SIGNED_URL_TTL = 60 * 60;

export type FamilyCertResult = {
  error?: string;
  url?: string | null;
  uploadedAt?: string | null;
};

function detectImageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") {
    return { ext: "png", mime: "image/png" };
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "heim", "heis", "hevc", "hevx"].includes(brand)) {
      return { ext: "heic", mime: "image/heic" };
    }
    if (["mif1", "msf1", "heif"].includes(brand)) {
      return { ext: "heif", mime: "image/heif" };
    }
  }
  return null;
}

export type FamilyCertFile = { bytes: Uint8Array; ext: string; mime: string };

export async function parseFamilyCertFile(
  file: unknown,
): Promise<{ error: string } | FamilyCertFile> {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "사진 파일을 선택해 주세요." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "파일 크기는 10MB 이하여야 합니다." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    return { error: "JPG, PNG, WEBP, HEIC 이미지만 올릴 수 있어요." };
  }
  return { bytes, ...type };
}

export async function saveFamilyCert(
  memberId: string,
  { bytes, ext, mime }: FamilyCertFile,
): Promise<FamilyCertResult> {
  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from("members")
    .select("family_cert_path")
    .eq("id", memberId)
    .maybeSingle();
  if (memberError || !member) {
    console.error("[family-cert] member lookup failed:", memberError?.code ?? "not found");
    return { error: "업로드에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const path = `${memberId}/family_cert_${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) {
    console.error("[family-cert] upload failed:", uploadError.message);
    return { error: "업로드에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const uploadedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("members")
    .update({ family_cert_path: path, family_cert_uploaded_at: uploadedAt })
    .eq("id", memberId);
  if (updateError) {
    console.error("[family-cert] member update failed:", updateError.code);
    await admin.storage.from(BUCKET).remove([path]);
    return { error: "업로드에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const oldPath = member.family_cert_path as string | null;
  if (oldPath && oldPath !== path) {
    const { error: removeError } = await admin.storage.from(BUCKET).remove([oldPath]);
    if (removeError) console.error("[family-cert] old file remove failed:", removeError.message);
  }

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return { url: signed?.signedUrl ?? null, uploadedAt };
}

export async function getFamilyCertSignedUrl(memberId: string): Promise<FamilyCertResult> {
  const admin = createAdminClient();
  const { data: member, error } = await admin
    .from("members")
    .select("family_cert_path, family_cert_uploaded_at")
    .eq("id", memberId)
    .maybeSingle();
  if (error) {
    console.error("[family-cert] lookup failed:", error.code);
    return { error: "가족관계증명서를 불러오지 못했어요." };
  }

  const path = member?.family_cert_path as string | null | undefined;
  if (!path) return { url: null, uploadedAt: null };

  const { data: signed, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError) {
    console.error("[family-cert] sign failed:", signError.message);
    return { error: "가족관계증명서를 불러오지 못했어요." };
  }

  return {
    url: signed.signedUrl,
    uploadedAt: (member?.family_cert_uploaded_at as string | null) ?? null,
  };
}

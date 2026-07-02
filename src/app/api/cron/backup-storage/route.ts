import { createAdminClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

const BACKUP_BUCKET = process.env.BACKUP_BUCKET ?? "hr-backup";
const SIGNATURES_BUCKET = "signatures";
// 한 번 실행에서 복사할 최대 파일 수 (타임아웃 방지, 증분이라 이후 실행이 이어받음)
const MAX_COPIES_PER_RUN = 400;

function createBackupClient() {
  return createSupabaseClient(
    process.env.BACKUP_SUPABASE_URL!,
    process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function contentTypeFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}

// Supabase Storage 버킷의 모든 파일 경로를 재귀적으로 수집
async function listAllStorageFiles(
  client: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        out.push(...(await listAllStorageFiles(client, bucket, path)));
      } else {
        out.push(path);
      }
    }

    if (data.length < 1000) break;
    offset += 1000;
  }

  return out;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BACKUP_SUPABASE_URL || !process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "백업 대상지 env 미설정" }, { status: 500 });
  }

  const source = createAdminClient();
  const backup = createBackupClient();

  // 백업지에 이미 있는 경로 집합 (증분 판단용)
  const existing = new Set(await listAllStorageFiles(backup, BACKUP_BUCKET));

  let copied = 0;
  let skipped = 0;
  const errors: string[] = [];
  let capped = false;

  const copy = async (
    destPath: string,
    download: () => Promise<ArrayBuffer>,
  ) => {
    if (existing.has(destPath)) {
      skipped++;
      return;
    }
    if (copied >= MAX_COPIES_PER_RUN) {
      capped = true;
      return;
    }
    try {
      const buffer = Buffer.from(await download());
      const { error } = await backup.storage
        .from(BACKUP_BUCKET)
        .upload(destPath, buffer, {
          contentType: contentTypeFor(destPath),
          upsert: false,
        });
      if (error) throw new Error(error.message);
      existing.add(destPath);
      copied++;
    } catch (e) {
      errors.push(`${destPath}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // 1) Supabase signatures 버킷 → backup/signatures/*
  const sigFiles = await listAllStorageFiles(source, SIGNATURES_BUCKET);
  for (const path of sigFiles) {
    if (capped) break;
    await copy(`${SIGNATURES_BUCKET}/${path}`, async () => {
      const { data, error } = await source.storage.from(SIGNATURES_BUCKET).download(path);
      if (error || !data) throw new Error(error?.message ?? "download 실패");
      return data.arrayBuffer();
    });
  }

  // 2) Vercel Blob 전체(프로필/현장사진/보건증/친권동의) → backup/vercel-blob/*
  let cursor: string | undefined;
  do {
    const res = await list({ cursor, limit: 1000 });
    for (const blob of res.blobs) {
      if (capped) break;
      await copy(`vercel-blob/${blob.pathname}`, async () => {
        const r = await fetch(blob.url);
        if (!r.ok) throw new Error(`fetch ${r.status}`);
        return r.arrayBuffer();
      });
    }
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor && !capped);

  return NextResponse.json({
    copied,
    skipped,
    remaining: capped ? "MAX_COPIES_PER_RUN 도달 — 다음 실행에서 이어짐" : 0,
    errors: errors.slice(0, 20),
    errorCount: errors.length,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { BlobNotFoundError, head } from "@vercel/blob";
import { decideUpdate } from "@/lib/ota/decide";

const MANIFEST_PATH = "ota/manifest.json";
const CACHE_TTL_MS = 60_000;

type ManifestCache = { manifest: unknown; at: number; logged: Set<string> };

let cache: ManifestCache | null = null;

async function loadManifest(): Promise<ManifestCache> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache;

  let manifest: unknown = null;
  try {
    const meta = await head(MANIFEST_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const res = await fetch(`${meta.url}?v=${meta.uploadedAt.getTime()}`, { cache: "no-store" });
    if (res.ok) {
      manifest = await res.json();
    } else {
      console.error("[app-update] manifest fetch failed:", res.status);
    }
  } catch (e) {
    if (!(e instanceof BlobNotFoundError)) {
      console.error("[app-update] manifest load error:", e instanceof Error ? e.message : e);
    }
  }

  cache = { manifest, at: Date.now(), logged: new Set() };
  return cache;
}

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = JSON.parse(await req.text());
  } catch {}

  const current = await loadManifest();
  const { response, problem } = decideUpdate(body, current.manifest);
  if (problem && !current.logged.has(problem)) {
    current.logged.add(problem);
    console.error("[app-update] manifest invalid:", problem);
  }

  return NextResponse.json(response);
}

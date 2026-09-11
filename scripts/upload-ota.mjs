import { put, head, BlobNotFoundError } from "@vercel/blob";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
const MANIFEST_PATH = "ota/manifest.json";
const TARGETS = { android: ["android"], ios: ["ios"], all: ["android", "ios"] };
const CHECK_URL = "https://humendhr.com/api/app-update";

const USAGE = `사용법:
  node scripts/upload-ota.mjs --platform android|ios|all --min-version-code <n> [--max-version-code <n>] [--version <이름>]
  node scripts/upload-ota.mjs --rollback android|ios|all

옵션:
  --platform          OTA 번들을 배포할 플랫폼
  --min-version-code  이 값 이상인 설치본에만 배포 (Android versionCode / iOS CFBundleVersion)
                      단일 플랫폼은 숫자, --platform all 은 android=7,ios=23 형식 (생략 시 manifest의 기존 값 유지)
  --max-version-code  이 값 이하인 설치본에만 배포 (형식은 위와 같음, 생략 시 상한 없음)
  --version           번들 이름 (기본: YYYY.MM.DD-HHmm)
  --rollback          해당 플랫폼 기기를 스토어 내장 번들로 되돌림
  --help              이 도움말

사전 조건: npm run build:capacitor 로 out/ 생성`;

function fail(message) {
  console.error(`오류: ${message}\n`);
  console.error(USAGE);
  process.exit(1);
}

let args;
try {
  ({ values: args } = parseArgs({
    options: {
      platform: { type: "string" },
      "min-version-code": { type: "string" },
      "max-version-code": { type: "string" },
      version: { type: "string" },
      rollback: { type: "string" },
      help: { type: "boolean" },
    },
  }));
} catch (e) {
  fail(e.message);
}

if (args.help || process.argv.length <= 2) {
  console.log(USAGE);
  process.exit(0);
}

const isRollback = args.rollback !== undefined;
if (isRollback === (args.platform !== undefined)) fail("--platform 또는 --rollback 중 하나만 지정하세요");

const targets = TARGETS[isRollback ? args.rollback : args.platform];
if (!targets) fail(`잘못된 플랫폼: ${isRollback ? args.rollback : args.platform}`);

function parseCodes(raw, flag) {
  if (raw === undefined) return {};
  if (targets.length === 1) {
    if (!/^\d+$/.test(raw)) fail(`잘못된 ${flag}: ${raw} (단일 플랫폼은 숫자)`);
    return { [targets[0]]: Number(raw) };
  }
  const codes = {};
  for (const part of raw.split(",")) {
    const m = part.trim().match(/^(android|ios)=(\d+)$/);
    if (!m) fail(`잘못된 ${flag}: ${raw} (--platform all 은 android=N,ios=M 형식)`);
    codes[m[1]] = Number(m[2]);
  }
  return codes;
}

function defaultVersion() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

const minCodes = isRollback ? {} : parseCodes(args["min-version-code"], "--min-version-code");
const maxCodes = isRollback ? {} : parseCodes(args["max-version-code"], "--max-version-code");
const version = args.version ?? defaultVersion();
if (!isRollback && (!/^[0-9A-Za-z._-]+$/.test(version) || version === "builtin")) {
  fail(`잘못된 --version: ${version} (영문/숫자/._- 만, "builtin" 불가)`);
}

if (!isRollback && !fs.existsSync(path.join(OUT_DIR, "index.html"))) {
  console.error("out/index.html 없음 — 먼저 npm run build:capacitor 를 실행하세요");
  process.exit(1);
}

const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (e) {
    console.warn(`경고: .env.local 읽기 실패 — ${e.message}`);
  }
}
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN 환경변수 없음");
  process.exit(1);
}

async function blobExists(pathname) {
  try {
    await head(pathname, { token });
    return true;
  } catch (e) {
    if (e instanceof BlobNotFoundError) return false;
    throw e;
  }
}

async function readManifest() {
  try {
    const meta = await head(MANIFEST_PATH, { token });
    const res = await fetch(`${meta.url}?v=${meta.uploadedAt.getTime()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`manifest fetch ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof BlobNotFoundError) return { android: null, ios: null, updatedAt: "" };
    throw e;
  }
}

const manifest = await readManifest();

if (isRollback) {
  for (const p of targets) manifest[p] = { ...(manifest[p] ?? {}), rollback: true };
} else {
  for (const p of targets) {
    const min = minCodes[p] ?? manifest[p]?.minVersionCode;
    if (typeof min !== "number") fail(`${p}: --min-version-code 필요 (기존 manifest 값 없음)`);
    minCodes[p] = min;
  }

  const bundlePath = `ota/bundles/${version}.zip`;
  if (await blobExists(bundlePath)) {
    console.error(`같은 이름의 번들이 이미 있어요 (${bundlePath}). --version으로 다른 이름을 주세요`);
    process.exit(1);
  }

  const gitStatus = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim();
  if (gitStatus) {
    console.warn("경고: 커밋되지 않은 변경이 있습니다 — 번들이 현재 커밋과 다를 수 있습니다.");
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ota-"));
  const zipPath = path.join(tmpDir, `${version}.zip`);
  execFileSync("zip", ["-r", "-q", "-X", zipPath, ".", "-x", "*.DS_Store"], { cwd: OUT_DIR });
  const zip = fs.readFileSync(zipPath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const checksum = crypto.createHash("sha256").update(zip).digest("hex");
  console.log(`번들: ${version}.zip (${(zip.length / 1024 / 1024).toFixed(1)} MB, sha256 ${checksum})`);

  const bundle = await put(bundlePath, zip, {
    access: "public",
    contentType: "application/zip",
    token,
    addRandomSuffix: false,
  });
  console.log("번들 업로드 완료:", bundle.url);

  for (const p of targets) {
    manifest[p] = { version, url: bundle.url, checksum, minVersionCode: minCodes[p], maxVersionCode: maxCodes[p] };
  }
}

manifest.updatedAt = new Date().toISOString();

const saved = await put(MANIFEST_PATH, JSON.stringify(manifest, null, 2), {
  access: "public",
  contentType: "application/json",
  token,
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
});

console.log(isRollback ? `롤백 설정 완료 (${targets.join(", ")})` : `배포 완료 (${targets.join(", ")})`);
console.log("Manifest:", saved.url);
console.log(JSON.stringify(manifest, null, 2));

async function verifyLive(p) {
  const expected = isRollback ? "builtin" : version;
  const body = {
    platform: p,
    version_code: String(isRollback ? (manifest[p].minVersionCode ?? 0) : minCodes[p]),
    version_build: "0",
    version_name: isRollback ? (manifest[p].version ?? "ota-check") : "builtin",
    app_id: "com.humend.hr",
  };
  try {
    const res = await fetch(CHECK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (data?.version === expected) {
      console.log(`${p}: 운영 반영 확인 (${expected})`);
      return;
    }
    console.warn(`경고: ${p}: 아직 반영 안 됨(최대 1분 캐시) 또는 Blob 스토어 불일치 확인 — 응답 ${JSON.stringify(data)}`);
  } catch (e) {
    console.warn(`경고: ${p}: 운영 확인 요청 실패 (${e.message}) — 아직 반영 안 됨(최대 1분 캐시) 또는 Blob 스토어 불일치 확인`);
  }
}

for (const p of targets) await verifyLive(p);

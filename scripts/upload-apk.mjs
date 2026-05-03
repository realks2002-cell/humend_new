import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APK_PATH = path.resolve(
  "android/app/build/outputs/apk/debug/app-debug.apk"
);

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN 환경변수 없음");
  process.exit(1);
}
if (!fs.existsSync(APK_PATH)) {
  console.error("APK 파일 없음:", APK_PATH);
  process.exit(1);
}

const buf = fs.readFileSync(APK_PATH);
const stat = fs.statSync(APK_PATH);
console.log(
  `APK: ${APK_PATH} (${(stat.size / 1024 / 1024).toFixed(1)} MB, mtime: ${stat.mtime.toISOString()})`
);

const result = await put("humend-hr.apk", buf, {
  access: "public",
  contentType: "application/vnd.android.package-archive",
  token: process.env.BLOB_READ_WRITE_TOKEN,
  allowOverwrite: true,
  addRandomSuffix: false,
});

console.log("업로드 완료");
console.log("URL:", result.url);
console.log("Pathname:", result.pathname);

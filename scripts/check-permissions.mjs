import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const phoneArg = args.find((a) => a.startsWith("--phone="))?.split("=")[1];
const allFlag = args.includes("--all");

if (!phoneArg && !allFlag) {
  console.log("사용법:");
  console.log("  node scripts/check-permissions.mjs --phone=01066081609");
  console.log("  node scripts/check-permissions.mjs --all");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let members;
if (phoneArg) {
  const { data } = await supabase
    .from("members")
    .select("id, name, phone, location_permission, battery_optimized, last_permission_check")
    .eq("phone", phoneArg);
  members = data ?? [];
} else {
  const { data } = await supabase
    .from("members")
    .select("id, name, phone, location_permission, battery_optimized, last_permission_check");
  members = data ?? [];
}

if (members.length === 0) {
  console.error("회원 없음");
  process.exit(1);
}

console.log(`대상 회원 ${members.length}명`);

const creds = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, "base64").toString("utf8")
);
const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});
const accessToken = await auth.authorize();
const projectId = process.env.FIREBASE_PROJECT_ID;

const beforeMap = new Map(members.map((m) => [m.id, m.last_permission_check]));

let totalSent = 0;
for (const m of members) {
  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("fcm_token, platform")
    .eq("member_id", m.id);

  if (!tokens || tokens.length === 0) {
    console.log(`  ${m.name} (${m.phone}) — FCM 토큰 없음`);
    continue;
  }

  let sent = 0;
  for (const { fcm_token } of tokens) {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: fcm_token,
            data: { type: "permission_check" },
            android: { priority: "high", ttl: "600s", collapse_key: "permission_check" },
            apns: {
              headers: { "apns-priority": "5", "apns-push-type": "background" },
              payload: { aps: { "content-available": 1 }, type: "permission_check" },
            },
          },
        }),
      }
    );
    if (res.ok) sent++;
    else {
      const err = await res.json().catch(() => ({}));
      console.error(`  ${m.name} 발송 실패:`, JSON.stringify(err.error?.message ?? err));
    }
  }
  if (sent > 0) {
    console.log(`  ${m.name} (${m.phone}) — ${sent}/${tokens.length} 발송`);
    totalSent++;
  }
}

console.log(`\n총 ${totalSent}/${members.length} 회원에게 진단 푸시 발송 완료`);
console.log("30초 대기 후 결과 조회...");
await new Promise((r) => setTimeout(r, 30_000));

const { data: after } = await supabase
  .from("members")
  .select("id, name, phone, location_permission, battery_optimized, last_permission_check, platform")
  .in("id", members.map((m) => m.id));

console.log("\n=== 결과 ===");
console.log("이름        | 전화         | 권한          | 배터리 | 보고시각          | 진단");
console.log("-----------|-------------|--------------|-------|------------------|--------");
for (const m of after ?? []) {
  const before = beforeMap.get(m.id);
  const responded = m.last_permission_check && m.last_permission_check !== before;
  const time = m.last_permission_check
    ? new Date(new Date(m.last_permission_check).getTime() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(11, 19)
    : "-";

  let diag;
  if (!responded) diag = "🔴 무응답 (배터리/강제종료/오프라인)";
  else if (m.location_permission === "always" && (m.battery_optimized === true || m.battery_optimized === null))
    diag = "🟢 정상";
  else if (m.location_permission === "whenInUse")
    diag = "🟡 백그라운드 미허용";
  else if (m.location_permission === "denied")
    diag = "🔴 권한 거부";
  else if (m.battery_optimized === false)
    diag = "🟡 배터리 최적화 ON";
  else diag = `⚠️ ${m.location_permission}`;

  console.log(
    `${(m.name ?? "?").padEnd(11)}| ${m.phone.padEnd(12)}| ${(m.location_permission ?? "-").padEnd(13)}| ${
      m.battery_optimized === null ? "-" : m.battery_optimized ? "ON " : "OFF"
    }   | ${time.padEnd(17)}| ${diag}`
  );
}

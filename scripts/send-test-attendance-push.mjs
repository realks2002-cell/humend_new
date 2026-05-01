import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const PHONE = "01034061921";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: member } = await supabase
  .from("members")
  .select("id, name")
  .eq("phone", PHONE)
  .single();

if (!member) {
  console.error("회원을 찾을 수 없습니다:", PHONE);
  process.exit(1);
}

console.log(`회원: ${member.name} (${member.id})`);

const { data: tokens } = await supabase
  .from("device_tokens")
  .select("fcm_token, platform, updated_at")
  .eq("member_id", member.id)
  .order("updated_at", { ascending: false });

if (!tokens || tokens.length === 0) {
  console.error("등록된 FCM 토큰 없음");
  process.exit(1);
}

console.log(`FCM 토큰 ${tokens.length}개 발견`);
tokens.forEach((t, i) => console.log(`  ${i + 1}. ${t.platform} (${t.updated_at})`));

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

let sent = 0;
let failed = 0;
const errors = [];

for (const { fcm_token, platform } of tokens) {
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
          notification: {
            title: "[휴멘드] 오늘 근무, 준비되셨나요?",
            body: "클릭하여 '출근확정'을 완료해 주세요! ✔️",
          },
          data: {
            action: "confirm_attendance",
            shiftId: "9df7bc47-0011-41b7-acf4-f84cd9ed502c",
            url: "/my/attendance",
          },
          android: {
            priority: "high",
            notification: { channel_id: "default", sound: "default" },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: { sound: "default", "content-available": 1 },
              action: "confirm_attendance",
              shiftId: "9df7bc47-0011-41b7-acf4-f84cd9ed502c",
              url: "/my/attendance",
            },
          },
        },
      }),
    }
  );

  if (res.ok) {
    sent++;
    console.log(`  ✓ ${platform} 발송 성공`);
  } else {
    failed++;
    const err = await res.json().catch(() => ({}));
    errors.push({ platform, error: err });
    console.error(`  ✗ ${platform} 발송 실패:`, JSON.stringify(err, null, 2));
  }
}

console.log(`\n결과: 성공 ${sent}, 실패 ${failed}`);
if (errors.length > 0) {
  console.error("실패 상세:", JSON.stringify(errors, null, 2));
}

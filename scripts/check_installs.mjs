import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// 1. 플랫폼별 토큰 수
const { data: tokens, error } = await sb
  .from("device_tokens")
  .select("platform, member_id, created_at, updated_at");

if (error) {
  console.error("ERROR:", error);
  process.exit(1);
}

const byPlatform = tokens.reduce((acc, t) => {
  const p = t.platform || "unknown";
  acc[p] = (acc[p] || 0) + 1;
  return acc;
}, {});

const uniqueMembers = new Set(tokens.map((t) => t.member_id)).size;

const uniqueByPlatform = tokens.reduce((acc, t) => {
  const p = t.platform || "unknown";
  if (!acc[p]) acc[p] = new Set();
  acc[p].add(t.member_id);
  return acc;
}, {});

// 최근 30일 활성
const now = Date.now();
const day30 = 30 * 24 * 60 * 60 * 1000;
const day7 = 7 * 24 * 60 * 60 * 1000;
const activeRecently = (days) =>
  tokens.filter((t) => now - new Date(t.updated_at).getTime() < days * 24 * 60 * 60 * 1000).length;

// 전체 회원 수
const { count: memberCount } = await sb
  .from("members")
  .select("*", { count: "exact", head: true });

console.log("========================================");
console.log("📱 앱 설치 / 활성 기기 통계");
console.log("========================================");
console.log(`전체 회원 수             : ${memberCount}명`);
console.log(`전체 device_tokens       : ${tokens.length}개`);
console.log(`고유 설치 회원 (앱 1회+) : ${uniqueMembers}명`);
console.log("");
console.log("플랫폼별 토큰 수 (재설치 포함):");
Object.entries(byPlatform).forEach(([p, c]) => console.log(`  ${p.padEnd(10)} : ${c}개`));
console.log("");
console.log("플랫폼별 고유 회원 수:");
Object.entries(uniqueByPlatform).forEach(([p, s]) =>
  console.log(`  ${p.padEnd(10)} : ${s.size}명`)
);
console.log("");
console.log("최근 활성 (토큰 updated_at 기준):");
console.log(`  최근 7일  : ${activeRecently(7)}개`);
console.log(`  최근 30일 : ${activeRecently(30)}개`);
console.log("========================================");

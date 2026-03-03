#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────
# Capacitor 로컬 번들 빌드 스크립트
# src/app-native/ → src/app/ 위에 overlay 복사 후 정적 빌드
# ─────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== [1/7] 작업 디렉토리 정리 ==="
# 빌드 전 혹시 이전 빌드 잔여물이 있으면 복원
git checkout -- src/app/ src/middleware.ts next.config.ts 2>/dev/null || true

echo "=== [2/7] Overlay: app-native → app 복사 ==="
# app-native 파일들을 app 위에 덮어쓰기 (기존 파일 교체)
cp -R src/app-native/* src/app/

echo "=== [3/7] 정적 빌드 호환성 위해 서버 전용 파일 제거 ==="
# admin 디렉토리 전체 제거 (회원 전용 빌드)
rm -rf src/app/admin

# API routes 제거 (정적 빌드에서 동작 불가)
rm -rf src/app/api

# Auth callback routes 제거
rm -rf src/app/auth

# 미들웨어 제거 (정적 빌드에서 동작 불가)
rm -f src/middleware.ts

# 동적 라우트 [id] 제거 (output: export 호환 불가 → /jobs/detail?client=xxx 사용)
rm -f "src/app/jobs/[id]/page.tsx"

# 남은 "use server" 파일 제거 (overlay 어댑터로 교체되지 않은 것들)
# overlay 어댑터가 이미 교체한 파일: my/actions.ts, my/salary/actions.ts,
# my/consent/actions.ts, about/actions.ts, jobs/actions.ts
# 남은 서버 전용 파일만 제거
grep -rl '"use server"' src/app --include="*.ts" --include="*.tsx" 2>/dev/null | while read f; do
  echo "  제거: $f"
  rm -f "$f"
done || true

echo "=== [4/7] Next.js 설정 교체 (정적 빌드용) ==="
# next.config.ts → capacitor 빌드 전용 설정으로 교체
cp next.config.capacitor.ts next.config.ts

echo "=== [5/7] Next.js 정적 빌드 (output: export) ==="
# API Bridge 호출 시 Vercel 서버를 가리키도록 환경변수 설정
NEXT_PUBLIC_API_BASE=https://humendhr.com npx next build

echo "=== [6/7] 소스 코드 복원 ==="
git checkout -- src/app/ src/middleware.ts next.config.ts

echo "=== [7/7] Capacitor sync ==="
npx cap sync android

echo ""
echo "✅ Capacitor 빌드 완료! out/ 디렉토리에 정적 파일 생성됨"
echo "   Android APK 빌드: cd android && ./gradlew assembleDebug"
echo "   Android AAB 빌드: cd android && ./gradlew bundleRelease"

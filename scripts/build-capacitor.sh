#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────
# Capacitor 로컬 번들 빌드 스크립트
# src/app-native/ → src/app/ 위에 overlay 복사 후 정적 빌드
# 사용법: bash scripts/build-capacitor.sh [android|ios|all]
# ─────────────────────────────────────────────────

PLATFORM="${1:-android}"

if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" && "$PLATFORM" != "all" ]]; then
  echo "❌ 잘못된 플랫폼: $PLATFORM (android, ios, all 중 선택)"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== [1/8] 작업 디렉토리 정리 (플랫폼: $PLATFORM) ==="
# 빌드 전 혹시 이전 빌드 잔여물이 있으면 복원
RESTORE_FILES="src/app/ src/middleware.ts next.config.ts"
if ! git diff --quiet src/app/ src/middleware.ts next.config.ts 2>/dev/null; then
  echo "  이전 빌드 잔여물 복원 중..."
  git checkout -- src/app/ src/middleware.ts next.config.ts
else
  echo "  (이전 빌드 잔여물 없음)"
fi

echo "=== [2/8] Overlay: app-native → app 복사 ==="
# app-native 파일들을 app 위에 덮어쓰기 (기존 파일 교체)
cp -R src/app-native/* src/app/

echo "=== [3/8] 정적 빌드 호환성 위해 서버 전용 파일 제거 ==="
# admin 디렉토리 전체 제거 (회원 전용 빌드)
rm -rf src/app/admin

# health-cert 제거 (Vercel Blob 서버 전용 기능)
rm -rf src/app/my/health-cert

# API routes 제거 (정적 빌드에서 동작 불가)
rm -rf src/app/api

# Auth callback routes 제거
rm -rf src/app/auth

# 미들웨어 제거 (정적 빌드에서 동작 불가)
rm -f src/middleware.ts

# 동적 라우트 [id] 제거 (output: export 호환 불가 → /jobs/detail?client=xxx 사용)
rm -f "src/app/jobs/[id]/page.tsx"

# 남은 "use server" 파일 제거 (overlay 어댑터로 교체되지 않은 것들)
SERVER_FILES=$(grep -rl '"use server"' src/app --include="*.ts" --include="*.tsx" 2>/dev/null) || true
if [ -n "$SERVER_FILES" ]; then
  echo "$SERVER_FILES" | while read f; do
    echo "  제거: $f"
    rm -f "$f"
  done
else
  echo "  (제거할 서버 파일 없음)"
fi

echo "=== [4/8] Next.js 설정 교체 (정적 빌드용) ==="
# next.config.ts → capacitor 빌드 전용 설정으로 교체
cp next.config.capacitor.ts next.config.ts

echo "=== [5/8] 심사 대응: 개발용 설정 제거 ==="
# capacitor.config.ts에서 server.url 제거 (로컬 번들 모드로 전환)
sed -i.bak "/url:.*10\.0\.2\.2/d" capacitor.config.ts
rm -f capacitor.config.ts.bak

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  # AndroidManifest.xml에서 networkSecurityConfig 제거
  sed -i.bak '/android:networkSecurityConfig/d' android/app/src/main/AndroidManifest.xml
  rm -f android/app/src/main/AndroidManifest.xml.bak

  # network_security_config.xml 삭제
  rm -f android/app/src/main/res/xml/network_security_config.xml
fi

echo "=== [6/8] Next.js 정적 빌드 (output: export) ==="
# API Bridge 호출 시 Vercel 서버를 가리키도록 환경변수 설정
NEXT_PUBLIC_API_BASE=https://humendhr.com npx next build

echo "=== [7/8] 소스 코드 복원 ==="
RESTORE_TARGETS="src/app/ src/middleware.ts next.config.ts capacitor.config.ts"
if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  RESTORE_TARGETS="$RESTORE_TARGETS android/app/src/main/AndroidManifest.xml"
fi
git checkout -- $RESTORE_TARGETS

echo "=== [8/8] Capacitor sync ==="
if [[ "$PLATFORM" == "android" ]]; then
  npx cap sync android
elif [[ "$PLATFORM" == "ios" ]]; then
  npx cap sync ios
elif [[ "$PLATFORM" == "all" ]]; then
  npx cap sync android
  npx cap sync ios
fi

echo ""
echo "✅ Capacitor 빌드 완료! out/ 디렉토리에 정적 파일 생성됨"
if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
  echo "   Android APK 빌드: cd android && ./gradlew assembleDebug"
  echo "   Android AAB 빌드: cd android && ./gradlew bundleRelease"
fi
if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
  echo "   iOS 빌드: Xcode에서 Archive → Distribute"
fi

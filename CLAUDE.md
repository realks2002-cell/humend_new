# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Humend HR은 **인력파견 플랫폼**입니다. 회원(파견 근로자)과 관리자(파견업체) 두 역할을 지원합니다.

- **회원**: 일자리 검색, 지원, 이력서 관리, 근무내역/급여 확인, 계약서 전자서명
- **관리자**: 고객사/채용공고/지원자/근무내역/급여/계약 관리

배포: Vercel (https://humendhr.com)

## Build & Development

```bash
npm run dev              # 로컬 개발 서버 (http://localhost:3000)
npm run build            # 프로덕션 빌드
npm run lint             # ESLint (v9 flat config)
```

### Capacitor (Android 앱)

```bash
npm run build:capacitor  # 정적 빌드 + cap sync (심사용, server.url 자동 제거)
npm run cap:sync         # Capacitor sync만 실행
npm run cap:open         # Android Studio 열기
npm run cap:run          # 에뮬레이터 실행
npm run cap:build        # Debug APK 빌드
npm run cap:release      # 정적 빌드 + Release AAB 빌드
```

**에뮬레이터 개발 시**: `capacitor.config.ts`의 `server.url`을 `http://10.0.2.2:3000`으로 변경 후 `npm run cap:sync` → Android Studio 플레이. 이 상태에서는 `npm run dev`로 실행 중인 로컬 서버를 바라봄.

**심사 제출 시**: `npm run build:capacitor` 사용. 스크립트가 `server.url` 제거, 서버 전용 파일 제거, 정적 빌드 후 원본 복원까지 자동 처리.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Language**: TypeScript (strict, path alias `@/*` → `src/*`)
- **Auth & DB**: Supabase (Auth + PostgreSQL + Storage + RLS)
- **Styling**: TailwindCSS v4 + shadcn/ui (Radix UI)
- **File Upload**: Vercel Blob Storage (프로필 사진)
- **Mobile App**: Capacitor 8 (Android 하이브리드 앱)
- **기타**: date-fns, recharts, jspdf, signature_pad, tiptap, resend, @dnd-kit, googleapis

## Architecture

### 웹 vs 앱 오버레이 패턴

`src/app/`(웹)과 `src/app-native/`(앱)이 별도로 존재. 앱 빌드 시 `app-native/` 파일이 `app/` 위에 덮어씌워짐. 같은 페이지라도 웹/앱에서 다른 동작이 필요하면 `app-native/`에 별도 파일 작성.

- **웹**: Server Actions(`"use server"`) + SSR 사용
- **앱**: Server Actions 불가 → `src/lib/native-api/`에서 Supabase browser client 직접 사용, API route(`/api/native/*`)로 서버 로직 대체
- **앱 인증**: Capacitor Preferences에 세션 토큰 저장, `auth-guard.tsx`로 보호
- **레이아웃 분리**: 웹과 앱의 layout.tsx는 반드시 별도로 관리. 웹은 고정 헤더(`pt-14` 등)를 고려하고, 앱은 BottomNav 기반이므로 상단 패딩 불필요. layout 수정 시 반드시 `app/`과 `app-native/` 양쪽 확인.

### 🚫 완성된 기능 — 절대 수정 금지

아래 기능은 안드로이드 앱과 웹 모두 완성된 상태. **사용자가 명시적으로 수정을 요청하지 않는 한 절대 건드리지 말 것.**

- **FCM 푸시 알림 시스템**: 배정 알림, cron 재알림, 수동 발송 (`lib/push/`, `api/cron/attendance-check`)
- **지오펜싱 출근 확인**: 접근 감지(2km) → 도착 확인(30m) → 이탈 감지(500m) (`lib/capacitor/geofence.ts`, `hooks/useAttendance.ts`)
- **근무 이탈 감지**: 이탈/복귀 기록 + 관리자 이력 표시 (`api/native/attendance/depart`, `return`, `departure_logs`)
- **근무표 관리** (`admin/shifts/`): ShiftTable, 배정 등록/수정/삭제, FCM 발송 기록
- **회원 가입/로그인**: 전화번호 + 비밀번호, 구글 OAuth (`app-native/signup/`, `app-native/login/`)
- **동의 체계**: 이용약관, 개인정보방침, 위치동의, 알림동의, 친권자동의

### ⚠️ 웹/앱 수정 전 필수 확인 (절대 규칙)

**코드 수정 전 반드시 아래 절차를 따를 것:**

1. **이 작업이 웹용인가 앱용인가?** — 사용자에게 불분명하면 물어볼 것
2. **앱용이면 `app-native/`에 해당 파일이 있는지 먼저 확인** — `app-native/`에 있으면 반드시 그 파일을 수정
3. **`app/` 파일을 수정할 때 `app-native/`에 같은 경로 파일이 있으면 경고** — 웹만 바뀌고 앱에는 반영 안 됨
4. **절대 `app-native/` 파일을 `app/` 내용으로 덮어쓰지 말 것** — 앱 전용 UI/로직이 파괴됨
5. **홈 화면 특히 주의** — 앱 홈(`app-native/`)과 웹 홈(`app/page.tsx`)은 완전히 다른 UI

### 인증 미들웨어 (`src/middleware.ts`)

- 공개 경로: `/`, `/about`, `/jobs`, `/login`, `/signup`, `/admin/login`
- `/my/*` → 회원 인증 필수 (members 테이블)
- `/admin/*` → 관리자 인증 필수 (admins 테이블)
- OAuth PKCE 콜백: `/?code=xxx` → `/auth/callback?code=xxx` 리다이렉트

### Server Actions 위치

- `src/app/**/actions.ts` — 웹용 Server Actions
- `src/lib/native-api/actions.ts` — 앱용 대체 함수 (Supabase client 직접 호출)

### 채용공고 타입

- **daily (시급제)**: `work_date` 기반, 날짜별 개별 슬롯
- **fixed_term (기간제)**: `start_date` ~ `end_date` + `work_days` 기반

## Directory Structure

```
src/
├── app/                  # 웹 페이지 (Next.js App Router)
├── app-native/           # 앱 전용 페이지 (빌드 시 app/ 대체)
├── components/
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── layout/           # Header, Footer, BottomNav, AppShell
│   ├── home/             # 랜딩 섹션
│   ├── jobs/             # 일자리 관련
│   └── signature/        # 전자서명 패드
├── lib/
│   ├── supabase/         # 클라이언트/서버/미들웨어 Supabase 인스턴스 + 쿼리
│   ├── native-api/       # 앱 전용 API 레이어 (인증, 쿼리, 액션)
│   ├── capacitor/        # 위치추적, 푸시알림, 지오펜싱
│   ├── google/           # Google Sheets 급여 Import
│   ├── pdf/              # 계약서 PDF 생성
│   └── utils/            # 급여 계산, 포맷팅
├── hooks/                # React 훅 (푸시알림 등)
├── middleware.ts          # 인증 미들웨어
└── types/                # TypeScript 타입 정의

capacitor.config.ts        # Capacitor 설정 (개발: server.url 사용, 심사: 빌드 스크립트가 제거)
next.config.capacitor.ts   # Capacitor용 Next.js 설정 (output: 'export')
scripts/build-capacitor.sh # 앱 빌드 스크립트 (8단계 자동화)
supabase/migrations/       # DB 마이그레이션 (28개)
```

## Database Tables (Supabase PostgreSQL)

| Table | Description |
|-------|------------|
| `members` | 회원 정보 (auth.users 연동) |
| `admins` | 관리자 정보 (auth.users 연동) |
| `clients` | 고객사 (파견처) 정보 |
| `client_photos` | 고객사 현장 사진 |
| `job_postings` | 채용공고 (daily: 날짜별 슬롯, fixed_term: 기간제) |
| `applications` | 지원 내역 |
| `work_records` | 근무내역 + 급여 계산 |
| `payments` | 최종 확정 급여 |
| `device_tokens` | FCM 푸시 토큰 (member_id + fcm_token) |
| `notification_logs` | 푸시 알림 발송 이력 |
| `parental_consents` | 친권자(보호자) 동의서 |
| `partner_inquiries` | 파트너(고객사) 제휴 문의 |

- 모든 테이블에 RLS(Row Level Security) 적용
- 회원은 본인 데이터만 조회/수정 가능
- 관리자는 admins 테이블에 존재하면 전체 접근 가능

## Auth Flow

- **회원 (전화번호)**: 전화번호 + Supabase OTP → `members` 테이블 조회/생성
- **회원 (구글)**: Google OAuth → `signInWithOAuth` (웹) / `signInWithIdToken` (앱)
- **관리자**: 이메일 + 비밀번호 → `admins` 테이블 존재 확인

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase 공개 키
SUPABASE_SERVICE_ROLE_KEY=       # Supabase 서비스 키 (서버 전용)
BLOB_READ_WRITE_TOKEN=           # Vercel Blob (프로필 사진)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=     # Google Maps (고객사 위치)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=    # Google OAuth
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=  # Google Sheets 서비스 계정
GOOGLE_SPREADSHEET_ID=           # Google Sheets ID
```

## Conventions

- **UI 텍스트**: 한국어
- **커밋 메시지**: 한국어 (conventional commits 형식)
- **코드/변수명**: 영어
- **Server Actions**: `"use server"` 디렉티브, `src/app/**/actions.ts`에 위치
- **Supabase RLS**: 클라이언트에서 직접 쿼리 시 RLS 정책 준수, service role key는 서버 전용
- **컴포넌트**: shadcn/ui 기반, `src/components/ui/`에 위치
- **스타일링**: TailwindCSS v4 유틸리티 클래스
- **Server Actions 크기 제한**: 5MB (`next.config.ts`에서 설정)
- **앱에서 CSS 주의**: Android WebView에서는 CSS 변수(`text-muted-foreground` 등)가 네이티브 input에 적용 안 될 수 있음. `opacity` 또는 인라인 `style`로 대체 필요.

## Capacitor 앱 개발 규칙

### capacitor.config.ts — 절대 임의 수정 금지
- `server.url` 값을 **절대 임의로 변경하지 말 것**. 앱이 바라보는 서버가 바뀌어 즉시 장애 발생.
- 개발/심사 전환은 반드시 `build-capacitor.sh` 스크립트를 통해서만 수행.
- 수동으로 `capacitor.config.ts`를 수정해야 하는 경우 반드시 사용자에게 **현재 값과 변경 값을 명시**하고 확인받을 것.

### CSS — Android WebView 스크롤 파괴 방지
```css
/* ❌ 절대 금지 — 스크롤 완전 파괴 */
* { user-select: none; }
* { -webkit-touch-callout: none; }
::-webkit-scrollbar { display: none; }
html, body { overscroll-behavior: none; }

/* ✅ body에만 적용 */
body {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
  touch-action: manipulation;
}
/* ✅ X축만 제한 */
html, body { overscroll-behavior-x: none; overflow-x: hidden !important; }
/* ✅ textarea는 height 강제 금지 */
input, select { height: 2rem !important; }
textarea { font-size: 13px !important; }
```

### 인증 토큰 — Supabase 세션만 사용
```typescript
// ✅ 올바름
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// ❌ Capacitor Preferences 사용 금지 (저장 코드 없어서 항상 null)
```

### 플랫폼 분기 — 동적 import 필수
```typescript
// ✅ 올바름
if (isNative()) {
  const { Camera } = await import("@capacitor/camera");
}
// ❌ 직접 import 금지 (웹 빌드에서 모듈 없음 에러)
import { Camera } from '@capacitor/camera';
```

### 빌드 순서 — sync 빠뜨리면 옛날 코드 실행
```
npm run build:capacitor → Android Studio Build APK → 설치
```
- cap sync는 소스 복원 전에 실행 (server.url 제거된 상태)
- 앱 클라이언트 코드 수정 시 반드시 APK 재빌드

### 코드 변경 반영 범위
| 변경 대상 | Vercel만으로 충분? | APK 재빌드 필요? |
|-----------|:---:|:---:|
| API route, Server Action, middleware | O | X |
| app-native/, lib/native-api/, lib/capacitor/, hooks, BottomNav, globals.css | X | O |

### FCM 푸시 알림
- 알림 채널: `PushNotifications.createChannel({ id: "default" })` — 서버 `channel_id`와 일치 필수
- 토큰 전송: fire-and-forget (페이지 전환으로 취소 방지)
- 토큰 갱신: 서버 API가 기존 토큰 DELETE → 새 토큰 INSERT
- **Server Action에서 FCM 발송은 반드시 `await`** — fire-and-forget(`.catch(console.error)`)하면 함수 종료 시 발송 중단됨. `Promise.allSettled`로 대기 필수
- **Cron 재알림 interval 체크에 `-1`분 버퍼** — 서브초 타이밍 차이로 정확히 N분에 조건 미충족 가능. `minutesSinceLast >= interval - 1`

### 지오펜싱 출근 확인
- `useAttendance` 훅 기반 → 앱이 열려야 시작됨 (React hook)
- `arrived`/`noshow`만 제외, 나머지 상태(`pending`/`notified`/`confirmed`)에서 모두 시작
- `@capacitor-community/background-geolocation` → 백그라운드 동작 O, 앱 강제 종료 시 중단
- 2km 접근 감지(1회) → 30m 출근 확인(watch 중단)
- 회원에게 **배터리 최적화 제외** 안내 필요 (삼성/샤오미 등에서 강제 종료 방지)

### Dialog body lock 주의
```typescript
// ❌ 스크롤 영구 잠금
<Dialog open={show} onOpenChange={() => {}}>
// ✅ 상태 연결
<Dialog open={show} onOpenChange={setShow}>
```

### 고아 유저 방지
- 구글 로그인 → auth.users 생성 → members 등록 실패 가능
- auth-guard.tsx + middleware.ts에서 members 체크 → 없으면 /signup/complete

### 위치정보 보관 기간
- **90일** — 모든 고지(signup, location-consent, privacy)에서 통일

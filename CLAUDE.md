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

# Humend HR - Project Context

## Overview

Humend HR은 **인력파견 플랫폼**입니다. 회원(파견 근로자)과 관리자(파견업체) 두 역할을 지원합니다.

- **회원**: 일자리 검색, 지원, 이력서 관리, 근무내역/급여 확인, 계약서 전자서명
- **관리자**: 고객사/채용공고/지원자/근무내역/급여/계약 관리

배포: Vercel (https://humendhr.com)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Language**: TypeScript
- **Auth & DB**: Supabase (Auth + PostgreSQL + Storage + RLS)
- **Styling**: TailwindCSS v4 + shadcn/ui (Radix UI)
- **File Upload**: Vercel Blob Storage (프로필 사진)
- **Mobile App**: Capacitor (Android 하이브리드 앱)
- **기타**: date-fns, recharts, jspdf, signature_pad, tiptap, resend, @dnd-kit, googleapis, @codetrix-studio/capacitor-google-auth

## Directory Structure

```
src/
├── app/                          # 웹 페이지 (Next.js App Router)
│   ├── page.tsx                  # 랜딩 페이지
│   ├── login/                    # 회원 로그인 (phone + OTP, Google OAuth)
│   ├── signup/                   # 회원가입
│   ├── jobs/                     # 일자리 목록/상세 (공개)
│   ├── my/                       # 회원 전용 (인증 필요)
│   │   ├── page.tsx              # 마이페이지 대시보드
│   │   ├── resume/               # 이력서 관리
│   │   ├── applications/         # 지원 내역
│   │   ├── salary/               # 급여 내역
│   │   ├── contracts/            # 계약서 관리
│   │   ├── history/              # 근무 이력
│   │   └── consent/              # 친권자 동의서
│   ├── admin/                    # 관리자 전용 (관리자 인증 필요)
│   │   ├── page.tsx              # 관리자 대시보드
│   │   ├── login/                # 관리자 로그인 (email + password)
│   │   ├── members/              # 회원 관리
│   │   ├── clients/              # 고객사 관리
│   │   ├── jobs/                 # 채용공고 관리
│   │   ├── applications/         # 지원자 관리
│   │   ├── contracts/            # 계약서 관리
│   │   ├── payroll/              # 급여 관리
│   │   ├── payments/             # 정산 관리
│   │   └── settings/             # 설정
│   ├── api/
│   │   ├── upload/               # 일반 파일 업로드
│   │   └── upload-profile/       # 프로필 사진 업로드 (Vercel Blob)
│   └── about/                    # 회사 소개
├── app-native/                   # 앱 전용 페이지 (Capacitor 빌드 시 app/ 대체)
│   ├── layout.tsx                # 앱 전용 레이아웃
│   ├── login/                    # 앱 전용 로그인 (Google 네이티브 Auth)
│   ├── signup/                   # 앱 전용 회원가입
│   ├── jobs/                     # 앱 전용 일자리
│   └── my/                       # 앱 전용 마이페이지
│       ├── consent/              # 앱 전용 친권자 동의서
│       ├── salary/               # 앱 전용 급여신청
│       └── history/              # 앱 전용 근무내역
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── layout/                   # Header, Footer, NativeAppProvider
│   ├── home/                     # 랜딩 섹션
│   ├── jobs/                     # 일자리 관련
│   └── signature/                # 전자서명 패드
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts             # 서버용 Supabase 클라이언트
│   │   ├── middleware.ts         # 미들웨어용 Supabase 클라이언트
│   │   ├── auth.ts               # 인증 헬퍼 함수
│   │   └── queries.ts            # 공통 DB 쿼리 함수
│   ├── native-api/               # 앱 전용 API 레이어
│   │   ├── auth.ts               # 앱용 인증 (Capacitor Preferences)
│   │   ├── auth-guard.tsx        # 앱용 인증 가드 컴포넌트
│   │   ├── queries.ts            # 앱용 DB 쿼리
│   │   └── actions.ts            # 앱용 Server Actions 대체
│   ├── capacitor/
│   │   └── push.ts               # 푸시 알림 (FCM) 관리
│   ├── utils/
│   │   ├── salary.ts             # 급여 계산 로직
│   │   └── format.ts             # 포맷팅 유틸
│   ├── pdf/
│   │   └── generate-contract.ts  # 계약서 PDF 생성
│   └── google/
│       └── sheets.ts             # Google Sheets 연동
├── hooks/
│   └── usePushNotifications.ts   # 푸시 알림 훅
├── middleware.ts                  # 인증 미들웨어 (라우트 보호)
└── types/                        # TypeScript 타입 정의

# 루트 디렉토리 주요 파일
capacitor.config.ts               # Capacitor 설정 (appId: com.humend.hr)
scripts/build-capacitor.sh        # Capacitor 앱 빌드 스크립트
next.config.capacitor.ts          # Capacitor용 Next.js 설정 (정적 내보내기)
```

## Key Files

- `src/middleware.ts` - 라우트 보호 (회원/관리자 인증 체크)
- `src/lib/supabase/queries.ts` - 주요 DB 쿼리 함수 모음
- `src/app/my/actions.ts` - 회원측 Server Actions
- `src/app/admin/actions.ts` - 관리자측 Server Actions
- `supabase/migrations/` - DB 스키마 마이그레이션 파일들 (14개)
- `capacitor.config.ts` - Capacitor 앱 설정
- `scripts/build-capacitor.sh` - Capacitor 빌드 스크립트
- `src/lib/native-api/auth.ts` - 앱 전용 인증 (Preferences 기반)
- `src/lib/google/sheets.ts` - Google Sheets 급여 Import

## Database Tables (Supabase PostgreSQL)

| Table | Description |
|-------|------------|
| `members` | 회원 정보 (auth.users 연동) |
| `admins` | 관리자 정보 (auth.users 연동) |
| `clients` | 고객사 (파견처) 정보 |
| `client_photos` | 고객사 현장 사진 |
| `job_postings` | 채용공고 (날짜별 슬롯) |
| `applications` | 지원 내역 |
| `work_records` | 근무내역 + 급여 계산 |
| `payments` | 최종 확정 급여 (work_records에서 복사, start_time/end_time 포함) |
| `device_tokens` | FCM 푸시 토큰 저장 (member_id + fcm_token) |
| `notification_logs` | 푸시 알림 발송 이력 |
| `parental_consents` | 친권자(보호자) 동의서 |
| `partner_inquiries` | 파트너(고객사) 제휴 문의 |

- 모든 테이블에 RLS(Row Level Security) 적용됨
- 회원은 본인 데이터만 조회/수정 가능
- 관리자는 admins 테이블에 존재하면 전체 접근 가능

## Auth Flow

- **회원 (전화번호)**: 전화번호 + Supabase OTP → `members` 테이블 조회/생성
- **회원 (구글)**: Google OAuth → Supabase `signInWithOAuth` (웹) / `signInWithIdToken` (앱) → `members` 테이블 조회/생성
- **관리자**: 이메일 + 비밀번호 → `admins` 테이블 존재 확인
- 미들웨어에서 `/my/*`는 회원 인증, `/admin/*`는 관리자 인증 강제
- **앱**: Capacitor Preferences에 세션 토큰 저장, `auth-guard.tsx`로 보호

## Environment Variables (.env.local)

```
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vercel Blob Storage (프로필 사진 업로드)
BLOB_READ_WRITE_TOKEN=

# Google Maps (고객사 위치 표시)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# Google OAuth (구글 로그인)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Google Sheets (급여 Import)
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=   # Base64 인코딩된 서비스 계정 JSON 키
GOOGLE_SPREADSHEET_ID=
```

## Conventions

- **UI 텍스트**: 한국어
- **커밋 메시지**: 한국어 (conventional commits 형식)
- **Server Actions**: `"use server"` 디렉티브 사용, `src/app/**/actions.ts`에 위치
- **Supabase RLS**: 클라이언트에서 직접 쿼리 시 RLS 정책 준수, service role key는 서버 전용
- **컴포넌트**: shadcn/ui 기반, `src/components/ui/`에 위치
- **스타일링**: TailwindCSS 유틸리티 클래스 사용

## PDCA Documents

프로젝트 문서는 `docs/` 아래에 위치합니다:
- `docs/01-plan/` - 기획 문서 (PRD, Feature Plan)
- `docs/02-design/` - 설계 문서
- `docs/03-analysis/` - Gap 분석 결과
- `docs/user-manual.md` - 사용자 매뉴얼
- `docs/.pdca-status.json` - PDCA 진행 상태

## Capacitor (Android 앱)

- **앱 ID**: `com.humend.hr`
- **빌드**: `scripts/build-capacitor.sh` 실행 → `next export` + `npx cap sync`
- **설정**: `capacitor.config.ts` (SplashScreen, StatusBar, PushNotifications 플러그인)
- **구조**: `src/app-native/`가 앱 빌드 시 `src/app/` 대체 (오버레이 패턴)
- **인증**: 앱에서는 Server Actions 대신 Supabase browser client 직접 사용 (`src/lib/native-api/`)
- **Google Play**: 로컬 번들 로드 방식 (서버 URL 미사용, 심사 대응)

## Scripts

- `scripts/create-admin.js` - 관리자 계정 생성 스크립트
- `scripts/create-admin-simple.js` - 간단한 관리자 생성 스크립트
- `scripts/build-capacitor.sh` - Capacitor Android 앱 빌드 스크립트

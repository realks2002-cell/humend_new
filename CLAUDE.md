# Humend HR - Project Context

## Overview

Humend HR은 **인력파견 플랫폼**입니다. 회원(파견 근로자)과 관리자(파견업체) 두 역할을 지원합니다.

- **회원**: 일자리 검색, 지원, 이력서 관리, 근무내역/급여 확인, 계약서 전자서명
- **관리자**: 고객사/채용공고/지원자/근무내역/급여/계약 관리

배포: Vercel (https://humend.co.kr)

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Language**: TypeScript
- **Auth & DB**: Supabase (Auth + PostgreSQL + Storage + RLS)
- **Styling**: TailwindCSS v4 + shadcn/ui (Radix UI)
- **File Upload**: Vercel Blob Storage (프로필 사진)
- **기타**: date-fns, recharts, jspdf, signature_pad, tiptap, resend, @dnd-kit

## Directory Structure

```
src/
├── app/
│   ├── page.tsx              # 랜딩 페이지
│   ├── login/                # 회원 로그인 (phone + OTP)
│   ├── signup/               # 회원가입
│   ├── jobs/                 # 일자리 목록/상세 (공개)
│   ├── my/                   # 회원 전용 (인증 필요)
│   │   ├── page.tsx          # 마이페이지 대시보드
│   │   ├── resume/           # 이력서 관리
│   │   ├── applications/     # 지원 내역
│   │   ├── salary/           # 급여 내역
│   │   ├── contracts/        # 계약서 관리
│   │   └── history/          # 근무 이력
│   ├── admin/                # 관리자 전용 (관리자 인증 필요)
│   │   ├── page.tsx          # 관리자 대시보드
│   │   ├── login/            # 관리자 로그인 (email + password)
│   │   ├── members/          # 회원 관리
│   │   ├── clients/          # 고객사 관리
│   │   ├── jobs/             # 채용공고 관리
│   │   ├── applications/     # 지원자 관리
│   │   ├── contracts/        # 계약서 관리
│   │   ├── payroll/          # 급여 관리
│   │   ├── payments/         # 정산 관리
│   │   └── settings/         # 설정
│   ├── api/
│   │   ├── upload/           # 일반 파일 업로드
│   │   └── upload-profile/   # 프로필 사진 업로드 (Vercel Blob)
│   └── about/                # 회사 소개
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── layout/               # Header, Footer
│   ├── home/                 # 랜딩 섹션
│   ├── jobs/                 # 일자리 관련
│   └── signature/            # 전자서명 패드
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts         # 서버용 Supabase 클라이언트
│   │   ├── middleware.ts     # 미들웨어용 Supabase 클라이언트
│   │   ├── auth.ts           # 인증 헬퍼 함수
│   │   └── queries.ts        # 공통 DB 쿼리 함수
│   ├── utils/
│   │   ├── salary.ts         # 급여 계산 로직
│   │   └── format.ts         # 포맷팅 유틸
│   ├── pdf/
│   │   └── generate-contract.ts  # 계약서 PDF 생성
│   └── google/
│       └── sheets.ts         # Google Sheets 연동
├── middleware.ts              # 인증 미들웨어 (라우트 보호)
└── types/                    # TypeScript 타입 정의
```

## Key Files

- `src/middleware.ts` - 라우트 보호 (회원/관리자 인증 체크)
- `src/lib/supabase/queries.ts` - 주요 DB 쿼리 함수 모음
- `src/app/my/actions.ts` - 회원측 Server Actions
- `src/app/admin/actions.ts` - 관리자측 Server Actions
- `supabase/migrations/` - DB 스키마 마이그레이션 파일들

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
| `payments` | 최종 확정 급여 (work_records에서 복사) |

- 모든 테이블에 RLS(Row Level Security) 적용됨
- 회원은 본인 데이터만 조회/수정 가능
- 관리자는 admins 테이블에 존재하면 전체 접근 가능

## Auth Flow

- **회원**: 전화번호 + Supabase OTP → `members` 테이블 조회/생성
- **관리자**: 이메일 + 비밀번호 → `admins` 테이블 존재 확인
- 미들웨어에서 `/my/*`는 회원 인증, `/admin/*`는 관리자 인증 강제

## Environment Variables (.env.local)

```
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vercel Blob Storage (프로필 사진 업로드)
BLOB_READ_WRITE_TOKEN=

# Kakao Map (고객사 위치 표시)
NEXT_PUBLIC_KAKAO_MAP_KEY=

# Google Sheets (선택)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
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

## Scripts

- `scripts/create-admin.js` - 관리자 계정 생성 스크립트
- `scripts/create-admin-simple.js` - 간단한 관리자 생성 스크립트

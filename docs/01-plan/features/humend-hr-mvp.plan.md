# Humend HR MVP 구현 계획서

> **Feature**: humend-hr-mvp
> **Level**: Dynamic
> **PRD Reference**: Humend_HR_플랫폼_PRD_v1.0.md (Phase 1 MVP)
> **Created**: 2026-02-11
> **Status**: Draft

---

## 1. 목표

PRD Phase 1 MVP 범위를 구현하여 Humend HR 플랫폼의 핵심 기능을 제공한다.

### MVP 범위 (PRD Phase 1)
- 랜딩 페이지, 사업소개 페이지
- 회원가입/로그인 (전화번호 + SMS OTP)
- 이력서 등록 (간단 정보 + 은행 계좌 + 프로필 사진)
- 고객사 카드 채용공고 (카드 그리드 + 날짜 슬롯 + 디테일 페이지)
- 지원하기 (확인팝업 → 지원완료)
- 회원 마이페이지 (근무신청 조회, 기본 대시보드)
- 관리자: 고객사 등록, 공고 등록, 지원 승인/거절, 회원 관리

### MVP에서 제외 (Phase 2+)
- 구글시트 연동 (급여 관리)
- 전자서명 + 계약서 PDF
- 근무내역 자동 생성
- 급여 신청/확정/지급
- Capacitor 하이브리드 앱

---

## 2. 기술 스택 (확정)

| 영역 | 기술 | 비고 |
|------|------|------|
| 프론트엔드 | Next.js 16 (App Router) + TypeScript | 설치 완료 |
| 스타일링 | Tailwind CSS v4 | 설치 완료 |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Storage) | 클라이언트 설정 완료 |
| 인증 | Supabase Auth (전화번호 + SMS OTP) | 관리자는 이메일 기반 |
| 상태관리 | Zustand + React Query | 추후 설치 |
| 배포 | Vercel + Supabase Cloud | - |

---

## 3. 현재 완료 상태

### 환경 설정 (완료)
- [x] Next.js 16 + TypeScript + Tailwind CSS v4 + ESLint 프로젝트 생성
- [x] `@supabase/supabase-js`, `@supabase/ssr` 설치
- [x] Supabase 클라이언트 설정 (`client.ts`, `server.ts`, `middleware.ts`)
- [x] 인증 세션 관리 미들웨어 (`src/middleware.ts`)
- [x] `.env.local.example` 환경변수 템플릿
- [x] PRD 사이트맵 기반 폴더 구조 생성 (19개 라우트)
- [x] `layout.tsx` 메타데이터 (title, lang="ko")
- [x] `page.tsx` 보일러플레이트 정리
- [x] 빌드 정상 동작 검증

---

## 4. 구현 순서 (Sprint 단위)

### Sprint 1: DB 스키마 + 인증 시스템
> 의존성 없음 — 모든 기능의 기반

**4.1 Supabase DB 스키마 생성**
- [ ] `members` 테이블 (회원 정보 + 이력서 + 은행 계좌)
- [ ] `admins` 테이블 (관리자)
- [ ] `clients` 테이블 (고객사)
- [ ] `client_photos` 테이블 (고객사 현장 사진)
- [ ] `job_postings` 테이블 (채용공고 날짜 슬롯)
- [ ] `applications` 테이블 (지원)
- [ ] RLS(Row Level Security) 정책 설정
- [ ] Storage 버킷 생성: `profile-photos`, `client-images`

**4.2 회원 인증 (전화번호 + SMS OTP)**
- [ ] `/signup` — 전화번호 입력 → SMS 인증 → 비밀번호 설정 → 가입완료
- [ ] `/login` — 전화번호 + 비밀번호 로그인
- [ ] Supabase Auth + Phone OTP 연동
- [ ] 인증 미들웨어 보호 경로 설정 (`/my/*`)
- [ ] 로그아웃 기능

**4.3 관리자 인증 (이메일 기반)**
- [ ] 관리자 이메일 + 비밀번호 로그인 (별도 경로 또는 역할 기반)
- [ ] 관리자 미들웨어 보호 경로 설정 (`/admin/*`)

**주요 파일:**
```
src/app/(auth)/signup/page.tsx
src/app/(auth)/login/page.tsx
src/lib/supabase/client.ts (기존)
src/lib/supabase/server.ts (기존)
src/middleware.ts (기존 — 보호 경로 추가)
supabase/migrations/001_initial_schema.sql
```

---

### Sprint 2: 퍼블릭 페이지 + 채용공고
> 의존: Sprint 1 (DB 스키마)

**4.4 랜딩 페이지 (`/`)**
- [ ] 히어로 섹션 (Humend HR 소개 + CTA)
- [ ] 서비스 소개 카드 섹션
- [ ] 최근 채용공고 미리보기 (3~4개)
- [ ] 통계 카운터 (등록 회원, 고객사, 매칭 수)
- [ ] CTA 버튼 (회원가입, 채용공고 보기)

**4.5 사업소개 페이지 (`/about`)**
- [ ] 비전/미션 섹션
- [ ] 서비스 프로세스 소개
- [ ] 문의 폼 (선택)

**4.6 채용공고 리스트 (`/jobs`)**
- [ ] 고객사 카드 그리드 (Mobile-First)
- [ ] 카드 구성: 대표사진 + 고객사명 + 위치 + 시급 + 날짜 슬롯
- [ ] 각 날짜 슬롯에 [지원하기] 버튼
- [ ] Supabase에서 `clients` + `job_postings` 조인 쿼리

**4.7 채용공고 상세 (`/jobs/[id]`)**
- [ ] 현장 사진 갤러리 (client_photos)
- [ ] 복장 안내, 근무태도 가이드
- [ ] 위치 지도 (카카오맵/네이버맵)
- [ ] 날짜 슬롯별 지원하기

**4.8 지원하기 기능**
- [ ] [지원하기] 클릭 → 확인 팝업 (모달)
- [ ] 확인 → `applications` 테이블 INSERT
- [ ] 중복 지원 방지 (같은 슬롯 재지원 불가)
- [ ] 비로그인 시 로그인 페이지로 리다이렉트

**주요 파일:**
```
src/app/page.tsx (랜딩)
src/app/about/page.tsx
src/app/jobs/page.tsx
src/app/jobs/[id]/page.tsx
src/components/jobs/JobCard.tsx
src/components/jobs/DateSlot.tsx
src/components/jobs/ApplyModal.tsx
src/components/ui/HeroSection.tsx
```

---

### Sprint 3: 회원 마이페이지
> 의존: Sprint 1 (인증), Sprint 2 (지원하기)

**4.9 이력서 등록/수정 (`/my/resume`)**
- [ ] 이름, 생년월일, 성별, 전화번호(자동), 거주지역
- [ ] 경험 유무 (유/무 선택) + 경험 내용 (텍스트)
- [ ] 프로필 사진 업로드 (1.5MB 이하 자동 리사이징)
- [ ] 은행명, 예금주, 계좌번호
- [ ] `members` 테이블 UPDATE + Storage 프로필 사진 업로드

**4.10 마이페이지 대시보드 (`/my`)**
- [ ] 진행중인 지원 현황 요약
- [ ] 다가오는 근무일정
- [ ] 최근 알림

**4.11 근무신청 조회 (`/my/applications`)**
- [ ] 내 지원 목록 (대기/승인/거절 상태 표시)
- [ ] 고객사명, 근무일, 시간, 상태 정보 표시

**주요 파일:**
```
src/app/my/page.tsx (대시보드)
src/app/my/resume/page.tsx
src/app/my/applications/page.tsx
src/components/my/DashboardSummary.tsx
src/components/my/ApplicationList.tsx
src/components/resume/ResumeForm.tsx
src/components/resume/ProfilePhotoUpload.tsx
```

---

### Sprint 4: 관리자 기능
> 의존: Sprint 1 (DB + 관리자 인증)

**4.12 관리자 대시보드 (`/admin`)**
- [ ] 오늘 근무 인원, 미처리 지원건, 주요 KPI 카드

**4.13 회원 관리 (`/admin/members`)**
- [ ] 회원 목록 (검색/필터)
- [ ] 회원 상세 정보 조회 + 이력서 열람
- [ ] 회원 상태 변경 (active/inactive)

**4.14 고객사 관리 (`/admin/clients`)**
- [ ] 고객사 등록/수정/삭제 폼
- [ ] 대표사진 + 현장사진 업로드 (Storage)
- [ ] 시급 설정, 담당자 정보, 복장안내, 근무가이드

**4.15 채용공고 관리 (`/admin/jobs`)**
- [ ] 공고 등록: 고객사 선택 → 날짜/시간/모집인원 슬롯 추가
- [ ] 공고 수정/마감 처리
- [ ] 공고별 지원현황 요약

**4.16 지원 관리 (`/admin/applications`)**
- [ ] 지원자 목록 (공고별/전체)
- [ ] 이력서 미리보기
- [ ] 승인/거절 처리 → `applications.status` UPDATE

**주요 파일:**
```
src/app/admin/page.tsx (대시보드)
src/app/admin/members/page.tsx
src/app/admin/clients/page.tsx
src/app/admin/jobs/page.tsx
src/app/admin/applications/page.tsx
src/components/admin/MemberTable.tsx
src/components/admin/ClientForm.tsx
src/components/admin/JobPostingForm.tsx
src/components/admin/ApplicationReview.tsx
```

---

### Sprint 5: 공통 컴포넌트 + 네비게이션 + 마무리
> 전 Sprint에 걸쳐 점진적 구현

**4.17 레이아웃 + 네비게이션**
- [ ] GNB (홈 / 채용공고 / 사업소개 / 마이페이지) — Mobile-First 반응형
- [ ] 회원용 사이드바/하단 탭 (마이페이지 하위 메뉴)
- [ ] 관리자용 사이드바 네비게이션
- [ ] 로그인/비로그인 상태에 따른 GNB 변경

**4.18 공통 UI 컴포넌트**
- [ ] Button, Input, Modal, Card, Badge 컴포넌트
- [ ] 로딩 스피너, Empty State
- [ ] Toast 알림 (zustand 기반)
- [ ] 반응형 기본 스타일 (Mobile-First)

**4.19 상태관리 + API 레이어**
- [ ] Zustand 설치 및 인증 스토어
- [ ] React Query 설치 및 Supabase 쿼리 훅

---

## 5. 데이터베이스 스키마 요약

PRD 섹션 9 기반, Supabase PostgreSQL 문법 적용:

| 테이블 | 주요 필드 | RLS |
|--------|-----------|-----|
| `members` | phone, name, birth_date, gender, region, bank info, profile_image_url | 본인만 읽기/수정 |
| `admins` | email, name, role | 관리자만 접근 |
| `clients` | company_name, location, hourly_wage, main_image_url, dress_code | 전체 읽기, 관리자만 쓰기 |
| `client_photos` | client_id, image_url, sort_order | 전체 읽기, 관리자만 쓰기 |
| `job_postings` | client_id, work_date, start_time, end_time, headcount, status | 전체 읽기, 관리자만 쓰기 |
| `applications` | posting_id, member_id, status(대기/승인/거절) | 본인 지원건 읽기, 관리자 전체 접근 |

---

## 6. 주요 기술 결정사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 인증 방식 | Supabase Auth Phone OTP (회원) + Email (관리자) | PRD 명시 |
| 라우팅 그룹 | `(auth)` 비인증, `(member)` 회원, `(admin)` 관리자 | 미들웨어 보호 효율화 |
| 이미지 업로드 | Supabase Storage + 클라이언트 리사이징 (1.5MB) | PRD 명시 |
| 지도 연동 | 카카오맵 JavaScript SDK | 국내 서비스, PRD 제안 |
| 폼 관리 | React Hook Form + Zod | 타입안전한 폼 검증 |

---

## 7. 리스크 & 의존성

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Supabase Phone Auth SMS 비용 | 인증 비용 증가 | 개발 중 이메일 대체, 프로덕션만 SMS 적용 |
| 프로필 사진 리사이징 성능 | 저사양 모바일 UX 저하 | `browser-image-compression` 라이브러리 사용 |
| RLS 정책 복잡도 | 보안 취약점 | Sprint 1에서 철저히 테스트 |
| 카카오맵 API 키 관리 | 환경변수 노출 | `.env.local`에서 관리, public key만 클라이언트 노출 |

---

## 8. 구현 우선순위 요약

```
Sprint 1 (기반)     Sprint 2 (퍼블릭)     Sprint 3 (회원)     Sprint 4 (관리자)     Sprint 5 (마무리)
─────────────────   ──────────────────   ─────────────────   ──────────────────   ──────────────────
DB 스키마            랜딩 페이지           이력서 등록          관리자 대시보드        GNB/레이아웃
RLS 정책             사업소개              마이 대시보드        회원 관리              공통 컴포넌트
Storage 버킷         채용공고 리스트        근무신청 조회        고객사 관리            상태관리
회원 인증(SMS OTP)   채용공고 상세          프로필사진 업로드    채용공고 관리          API 레이어
관리자 인증          지원하기 기능                              지원 관리
```

> **참고:** Sprint 5(공통 컴포넌트)는 독립 Sprint이 아닌, Sprint 1~4 진행 중 필요에 따라 점진적으로 구현

---

## 9. 다음 단계

1. 이 Plan 문서 확정 후 → `/pdca design humend-hr-mvp`로 상세 설계
2. Sprint 1부터 순차 구현 시작
3. 각 Sprint 완료 후 Gap 분석 → 반복 개선

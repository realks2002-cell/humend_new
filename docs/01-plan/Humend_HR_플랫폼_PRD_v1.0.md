# Humend HR - 인력 아웃소싱 플랫폼 PRD v1.0

> **프로젝트명:** Humend HR  
> **상태:** 확정 초안  
> **작성일:** 2026-02-10  
> **기술스택:** Next.js + Tailwind CSS + Supabase + Capacitor  
> **벤치마킹:** 알바몬(albamon.com)  

---

## 1. 프로젝트 개요

Humend HR은 인력 아웃소싱 공급업체가 구직자(회원)와 고객사(웨딩홀, 캐터링 서비스 등)를 매칭하고, 계약·급여·근무 관리를 디지털화하는 올인원 플랫폼이다.

- **플랫폼:** 반응형 웹 (Mobile-First) → 하이브리드 앱(iOS/Android) 확장 예정
- **사용자 역할:** 구직자(회원), 관리자 — 2가지만 존재
- **고객사:** 약 20개 (웨딩홀, 캐터링 서비스 등). 고객사 포털 없음, 관리자가 대행 관리
- **핵심 차별점:** 일일계약서 온라인 체결, 구글시트 연동 급여 관리, 4대보험·주휴수당 자동계산

---

## 2. 사용자 역할

### 2.1 구직자 (회원)
- 일용직/단기 근무 희망자
- 핵심 니즈: 빠른 일자리 확인, 간편 지원, 급여 투명성, 근무이력 관리
- 가입: 전화번호 + 비밀번호 (최대한 간편)

### 2.2 관리자
- Humend HR 운영 담당자
- 핵심 니즈: 인력 풀 관리, 고객사별 공고 등록, 지원 승인/거절, 급여 정산(구글시트), 계약 관리
- 고객사의 인력 요청을 받아 공고 등록하는 역할

---

## 3. 전체 서비스 플로우

```
1. 회원가입 (전화번호 + 비밀번호, SMS 인증)
2. 이력서 등록 (간단 정보 + 은행 계좌)
3. 채용공고 — 고객사 카드에서 원하는 날짜 슬롯 지원 → 확인 팝업 → 지원 완료
4. 관리자가 지원자 목록 보고 승인/거절
5. 승인 시 → 근무내역 자동 생성 (공고 정보 기반)
6. 실제 근무
7. 회원이 마이페이지에서 근무내역 확인
8. 회원이 건별 급여 신청 → 이 시점에 일일계약서 전자서명
9. 관리자가 구글시트에서 급여 확인/수정 (시간·수당 조정) → Supabase 동기화
10. 수정 확정 데이터 기준으로 계약서 최종 반영 → 급여 지급 처리
```

**핵심 원칙:** 관리자가 구글시트에서 최종 수정한 데이터가 절대 기준. DB 저장되고 계약서도 이 기록으로 수정된 계약서가 남는다.

---

## 4. 사이트맵 & 페이지 구조

### 4.1 퍼블릭 영역 (비로그인)

| 페이지 | 경로 | 설명 | 주요 컴포넌트 |
|--------|------|------|---------------|
| 랜딩 페이지 | `/` | Humend HR 첫인상, 핵심 가치 전달 | 히어로 섹션, 서비스 소개 카드, 최근 채용공고 미리보기, 통계 카운터, CTA 버튼 |
| 채용공고 | `/jobs` | 고객사 카드 그리드 배열 | 고객사 카드 (대표사진 + 시급 + 날짜 슬롯), 지원하기 버튼 |
| 채용공고 상세 | `/jobs/:id` | 고객사 상세 정보 | 현장 사진 갤러리, 복장 안내, 근무태도 가이드, 위치 지도, 날짜 슬롯별 지원 |
| 사업소개 | `/about` | Humend HR 회사/서비스 소개 | 비전/미션, 서비스 프로세스, 고객사 사례, 문의 폼 |
| 회원가입 | `/signup` | 간편 가입 | 전화번호 + 비밀번호 + SMS 인증 |
| 로그인 | `/login` | 로그인 | 전화번호 + 비밀번호 |

### 4.2 회원 영역 (로그인 후)

| 페이지 | 경로 | 주요 기능 |
|--------|------|-----------|
| 마이페이지 (대시보드) | `/my` | 진행중인 지원 현황, 다가오는 근무일정, 최근 급여 요약, 알림 |
| 근무신청 조회 | `/my/applications` | 지원 목록 — 대기/승인/거절 상태 확인 |
| 근무내역 확인 | `/my/history` | 승인된 근무 기록 리스트, 캘린더 뷰, 월별·연별 통계 |
| 급여 신청 | `/my/salary` | 근무내역 기반 건별 급여 신청, 급여 지급 상태 확인 (대기/확정/지급완료) |
| 내 계약서 조회 | `/my/contracts` | 체결된 계약서 목록, PDF 다운로드 |
| 이력서 관리 | `/my/resume` | 이력서 수정, 은행 계좌 정보 관리 |

### 4.3 관리자 영역

| 페이지 | 경로 | 주요 기능 |
|--------|------|-----------|
| 대시보드 | `/admin` | 오늘 근무 인원, 미처리 지원건, 급여 미처리 건수, 주요 KPI |
| 회원 관리 | `/admin/members` | 회원 목록 (검색/필터), 상세 정보 조회, 이력서 열람, 상태 변경 |
| 고객사 관리 | `/admin/clients` | 고객사 등록/수정/삭제, 대표사진·현장사진 업로드, 시급 설정, 담당자 정보 |
| 채용공고 관리 | `/admin/jobs` | 공고 등록 (고객사 선택 → 날짜/시간/모집인원 슬롯 추가), 수정/마감 |
| 지원 관리 | `/admin/applications` | 지원자 목록, 이력서 미리보기, 승인/거절 처리, 알림 발송 |
| 급여 관리 | `/admin/payroll` | 구글시트 내보내기/가져오기, 급여 확정, 지급 처리, 급여 대장 |
| 계약 관리 | `/admin/contracts` | 계약서 현황, 서명 상태 추적, 계약서 조회 |

---

## 5. 채용공고 카드 UI 구조 (A안 확정)

하나의 고객사 카드 안에 여러 날짜 슬롯이 나열되는 구조.

### 카드 레이아웃

```
┌─────────────────────────────────┐
│  [📸 고객사 대표사진]             │
│                                 │
│  그랜드웨딩홀                     │
│  📍 강남구  ·  💰 시급 12,000원   │
├─────────────────────────────────┤
│  2/15(토) 11:00~20:00  3명 모집  [지원]  │
│  2/16(일) 10:00~19:00  2명 모집  [지원]  │
│  2/22(토) 11:00~20:00  4명 모집  [지원]  │
└─────────────────────────────────┘
```

### 카드 구성 요소
- **대표사진:** 관리자가 고객사 등록 시 업로드
- **고객사명:** 웨딩홀, 캐터링 업체 등
- **위치:** 지역 표시
- **시급:** 고객사마다 상이
- **날짜 슬롯:** 근무일, 근무시간, 모집인원, 지원 버튼

### 카드 클릭 → 디테일 페이지 (`/jobs/:id`)
- 현장 사진 갤러리 (여러 장)
- 복장 안내 (유니폼 제공 여부, 복장 규정 등)
- 근무태도 가이드 (행사 특성, 주의사항 등)
- 위치 지도 (카카오맵/네이버맵 연동)
- 날짜 슬롯별 지원하기

### 지원 플로우
1. 날짜 슬롯 옆 [지원하기] 클릭
2. 확인 팝업: "그랜드웨딩홀 2/15(토) 11:00~20:00 지원하시겠습니까?"
3. 확인 → 지원 완료
4. 관리자가 승인/거절 (초과 지원 가능, 관리자가 선별)

---

## 6. 회원가입 & 이력서

### 6.1 회원가입 (최대한 간편)

```
Step 1: 전화번호 입력 → SMS 인증번호 발송
Step 2: 인증번호 확인
Step 3: 비밀번호 설정
→ 가입 완료
```

- 소셜 로그인 불필요 (전화번호 기반)
- 추가 정보는 이력서 등록에서 처리

### 6.2 이력서 등록 (심플)

웨딩홀·캐터링 업종 특성상 특별한 스펙 불필요. 최소한의 정보만 수집.

| 필드 | 필수 | 비고 |
|------|------|------|
| 이름 | ✅ | |
| 생년월일 | ✅ | 나이 자동 계산 |
| 성별 | ✅ | |
| 전화번호 | ✅ | 가입 시 입력된 번호 자동 |
| 거주 지역 | ✅ | 시/구 단위 |
| 경험 유무 | ✅ | 유/무 선택 |
| 경험 내용 | ❌ | 있으면 간단히 (자유 텍스트) |
| 프로필 사진 | ✅ | 필수. 업로드 시 자동으로 1.5MB 이하로 리사이징 후 저장 |
| 은행명 | ✅ | 급여 지급용 |
| 예금주 | ✅ | |
| 계좌번호 | ✅ | |

### 프로필 사진 업로드 규격
- **리사이징:** 업로드 시 클라이언트에서 1.5MB 이하로 자동 리사이징 (Canvas API 또는 browser-image-compression 라이브러리)
- **허용 포맷:** JPG, PNG, WEBP
- **리사이징 로직:** 원본이 1.5MB 초과 시 → quality 값을 점진적으로 낮추거나 해상도를 줄여 1.5MB 이하로 압축
- **저장:** Supabase Storage `profile-photos` 버킷에 저장, URL을 members 테이블 `profile_image_url`에 기록

---

### 체결 타이밍
회원이 **급여 신청 시점**에 계약서 전자서명. 근무 후 급여를 신청하면서 계약서에 서명하는 플로우.

### 계약서 내용
관리자가 구글시트에서 최종 수정한 데이터가 계약서에 반영됨.
- 근로자 정보 (이름, 전화번호)
- 고객사 (근무지)
- 근무일, 근무시간 (시작~종료)
- 실근무시간, 연장근무시간
- 시급, 기본급, 연장수당, 주휴수당
- 4대보험 공제 내역
- 실수령액
- 계좌 정보
- 전자서명

### 전자서명 방식
- Canvas API 기반 서명 패드 (모바일 터치 / PC 마우스)
- 서명 이미지 Supabase Storage 저장
- 서명 완료 시 계약서 PDF 자동 생성

### 계약서 최종성
- **관리자 구글시트 수정이 최종 기준**
- 수정된 데이터로 계약서가 갱신/재생성됨
- 회원은 마이페이지 `/my/contracts`에서 최종 계약서 PDF 다운로드 가능

---

## 8. 급여 관리 시스템

### 8.1 급여 플로우

```
1. 관리자가 지원 승인 → 근무내역 자동 생성 (공고 데이터 기반)
2. 회원이 근무내역 확인 후 건별 급여 신청
3. 관리자가 "구글시트 내보내기" → 해당 기간 근무내역이 구글시트로 전송
4. 관리자가 구글시트에서 근무자별 수정 (시간 조정, 수당 등)
5. 구글시트 수식으로 4대보험·주휴수당·실수령액 자동 재계산
6. 수정 완료 → "Supabase 동기화" → DB 저장
7. 확정 데이터 기준 계약서 최종 반영 → 급여 지급 처리
```

### 8.2 구글시트 연동

**연동 방식:** 수동 트리거 (관리자가 버튼으로 내보내기/가져오기)

**시트 컬럼 구조:**

| 컬럼 | 편집 | 설명 |
|------|------|------|
| job_id | 자동 (PK) | 근무 고유번호 |
| member_name | 자동 | 회원명 |
| phone | 자동 | 전화번호 |
| workplace | 자동 | 고객사명 |
| work_date | 자동 | 근무일 |
| start_time | ✏️ 수정가능 | 출근시간 |
| end_time | ✏️ 수정가능 | 퇴근시간 |
| work_hours | ✏️ 수정가능 | 실근무시간 |
| overtime_hours | ✏️ 수정가능 | 연장근무시간 |
| overtime_allowance | 자동계산 | 연장수당 |
| hourly_wage | ✏️ 수정가능 | 시급 |
| weekly_holiday_pay | 자동계산 | 주휴수당 (주 15시간 이상 시) |
| national_pension | 자동계산 | 국민연금 (4.5%) |
| health_insurance | 자동계산 | 건강보험 (3.545%) |
| long_term_care | 자동계산 | 장기요양보험 (건강보험의 12.81%) |
| employment_insurance | 자동계산 | 고용보험 (0.9%) |
| insurance_total | 자동계산 | 4대보험 합계 |
| total_pay | 자동계산 | 총지급액 (기본급 + 연장수당 + 주휴수당) |
| total_deduction | 자동계산 | 총공제액 (4대보험 합계) |
| net_pay | 자동계산 | **실수령액** |
| bank_name | 자동 | 은행명 |
| account_holder | 자동 | 예금주 |
| account_number | 자동 | 계좌번호 |
| status | ✏️ 수정가능 | 대기중 / 확정 / 지급완료 |
| contract_signed | 자동 | 서명 여부 |
| admin_memo | ✏️ 수정가능 | 관리자 메모 |
| source_type | 자동 | 데이터 출처 (work_schedule) |
| created_at | 자동 | 생성일시 |
| updated_at | 자동 | 수정일시 |

**자동계산 수식 (구글시트 내):**
- `overtime_allowance` = overtime_hours × hourly_wage × 1.5
- `weekly_holiday_pay` = 주 15시간 이상 시 (주간 총 근무시간 / 40) × 8 × hourly_wage
- `national_pension` = (total_pay) × 0.045
- `health_insurance` = (total_pay) × 0.03545
- `long_term_care` = health_insurance × 0.1281
- `employment_insurance` = (total_pay) × 0.009
- `insurance_total` = 4대보험 합산
- `total_pay` = (work_hours × hourly_wage) + overtime_allowance + weekly_holiday_pay
- `total_deduction` = insurance_total
- `net_pay` = total_pay - total_deduction

---

## 9. 데이터베이스 스키마

### 9.1 jobs 테이블 (핵심 — 기존 구조 기반 확장)

```sql
CREATE TABLE jobs (
  job_id              INT AUTO_INCREMENT PRIMARY KEY,
  member_name         VARCHAR(100) NOT NULL,
  phone               VARCHAR(20) NOT NULL,
  workplace           VARCHAR(255) NOT NULL,
  work_date           DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  work_hours          DECIMAL(5,2) NOT NULL,
  overtime_hours      DECIMAL(5,2) DEFAULT 0.00,
  overtime_allowance  INT DEFAULT 0,
  hourly_wage         INT DEFAULT 0,
  weekly_holiday_pay  INT DEFAULT 0,
  national_pension    INT DEFAULT 0,
  health_insurance    INT DEFAULT 0,
  long_term_care      INT DEFAULT 0,
  employment_insurance INT DEFAULT 0,
  insurance_total     INT DEFAULT 0,
  total_pay           INT DEFAULT 0,
  total_deduction     INT DEFAULT 0,
  net_pay             INT DEFAULT 0,
  status              VARCHAR(50) DEFAULT '대기중',
  source_type         VARCHAR(50) DEFAULT 'work_schedule',
  contract_signed     BOOLEAN DEFAULT FALSE,
  contract_signed_at  TIMESTAMP NULL,
  contract_pdf_url    VARCHAR(500) NULL,
  admin_memo          TEXT NULL,
  bank_name           VARCHAR(50) NULL,
  account_holder      VARCHAR(50) NULL,
  account_number      VARCHAR(50) NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 9.2 추가 테이블

```sql
-- 회원 테이블
CREATE TABLE members (
  member_id           INT AUTO_INCREMENT PRIMARY KEY,
  phone               VARCHAR(20) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  birth_date          DATE,
  gender              VARCHAR(10),
  region              VARCHAR(100),
  has_experience      BOOLEAN DEFAULT FALSE,
  experience_detail   TEXT NULL,
  profile_image_url   VARCHAR(500) NULL,
  bank_name           VARCHAR(50) NULL,
  account_holder      VARCHAR(50) NULL,
  account_number      VARCHAR(50) NULL,
  status              VARCHAR(20) DEFAULT 'active',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 고객사 테이블
CREATE TABLE clients (
  client_id           INT AUTO_INCREMENT PRIMARY KEY,
  company_name        VARCHAR(255) NOT NULL,
  location            VARCHAR(255),
  contact_person      VARCHAR(100),
  contact_phone       VARCHAR(20),
  hourly_wage         INT DEFAULT 0,
  main_image_url      VARCHAR(500) NULL,
  description         TEXT NULL,
  dress_code          TEXT NULL,
  work_guidelines     TEXT NULL,
  status              VARCHAR(20) DEFAULT 'active',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 고객사 현장 사진 테이블
CREATE TABLE client_photos (
  photo_id            INT AUTO_INCREMENT PRIMARY KEY,
  client_id           INT NOT NULL,
  image_url           VARCHAR(500) NOT NULL,
  sort_order          INT DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- 채용공고 (날짜 슬롯) 테이블
CREATE TABLE job_postings (
  posting_id          INT AUTO_INCREMENT PRIMARY KEY,
  client_id           INT NOT NULL,
  work_date           DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  headcount           INT DEFAULT 1,
  status              VARCHAR(20) DEFAULT 'open',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- 지원 테이블
CREATE TABLE applications (
  application_id      INT AUTO_INCREMENT PRIMARY KEY,
  posting_id          INT NOT NULL,
  member_id           INT NOT NULL,
  status              VARCHAR(20) DEFAULT '대기',
  applied_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at         TIMESTAMP NULL,
  admin_memo          TEXT NULL,
  FOREIGN KEY (posting_id) REFERENCES job_postings(posting_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- 관리자 테이블
CREATE TABLE admins (
  admin_id            INT AUTO_INCREMENT PRIMARY KEY,
  email               VARCHAR(255) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  role                VARCHAR(50) DEFAULT 'admin',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 10. 알바몬 벤치마킹 분석

| 참고 요소 | 알바몬 방식 | Humend HR 적용 |
|-----------|------------|----------------|
| 채용공고 리스트 | 테이블형 리스트 + 지역/급여/시간 컬럼 | **고객사 카드 그리드** (대표사진 + 날짜 슬롯). 카드형이 모바일에 최적 |
| 검색/필터 | 지역별, 업종별, 브랜드별 탭 구분 | 고객사 20개로 고정, 필터 대신 카드 스크롤. 심플한 구조 |
| 회원 서비스 | 이력서 등록, 온라인지원, 인재정보 | 이력서 + 계약/급여/근무이력 **통합 관리** (차별점) |
| 메인 GNB | 채용정보/브랜드알바/회원서비스/인재정보/알바토크 | **홈 / 채용공고 / 사업소개 / 마이페이지** (간결) |
| 모바일 대응 | 반응형 + 앱 별도 제공 | Mobile-First 반응형 → Capacitor 하이브리드 앱 전환 |

---

## 11. 기술 아키텍처

| 영역 | 기술 선택 | 비고 |
|------|-----------|------|
| 프론트엔드 | Next.js 14+ (App Router), Tailwind CSS | Mobile-First 반응형 |
| 상태관리 | Zustand + React Query | |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Storage) | RLS로 역할 기반 접근 제어 |
| 인증 | Supabase Auth (전화번호 + SMS OTP) | 관리자는 이메일 기반 별도 인증 |
| 구글시트 연동 | Google Sheets API v4 | 수동 트리거 (내보내기/가져오기 버튼) |
| 전자서명 | Canvas API 서명 패드 | 서명 이미지 Supabase Storage 저장 |
| 계약서 PDF | jsPDF 또는 Puppeteer | 관리자 확정 데이터 기준 자동 생성 |
| 하이브리드 앱 | Capacitor (iOS/Android) | Phase 3에서 전환 |
| 푸시 알림 | FCM (Firebase Cloud Messaging) | 앱 전환 후 적용 |
| 배포 | Vercel (프론트) + Supabase Cloud (백엔드) | GitHub Actions CI/CD |
| 보안 | HTTPS, 개인정보 암호화, 접근 로그 | 개인정보보호법 준수 |

---

## 12. 개발 로드맵

### Phase 1 — MVP (6~8주)
- 랜딩 페이지, 사업소개 페이지
- 회원가입/로그인 (전화번호 + SMS)
- 이력서 등록 (간단 정보 + 은행 계좌)
- 고객사 카드 채용공고 (카드 그리드 + 날짜 슬롯 + 디테일 페이지)
- 지원하기 (확인팝업 → 지원완료)
- 회원 마이페이지 (근무신청 조회, 기본 대시보드)
- 관리자: 고객사 등록, 공고 등록, 지원 승인/거절, 회원 관리

### Phase 2 — 핵심 차별화 (4~6주)
- 근무내역 자동 생성 (승인 기반)
- 건별 급여 신청
- 구글시트 연동 (내보내기/가져오기)
- 4대보험·주휴수당 자동계산 (시트 수식)
- 일일계약서 전자서명 + PDF 생성
- 관리자 급여 확정/지급 처리
- 회원 마이페이지: 근무내역, 급여현황, 계약서 조회

### Phase 3 — 하이브리드 앱 (4~6주)
- Capacitor로 iOS/Android 빌드
- 푸시 알림 (승인/거절, 급여 지급 등)
- GPS 출퇴근 체크인 (선택)
- 앱스토어/플레이스토어 배포

### Phase 4 — 고도화 (지속적)
- QR코드 출퇴근 체크인
- 구직자 평점/리뷰 시스템
- AI 인력 매칭 추천
- 알림톡/문자 자동 발송 (카카오 알림톡)
- 다국어 지원 (베트남어/중국어/영어)
- 간편 일당 지급 (토스/카카오페이 연동)

---

## 13. 브레인스토밍 아이디어 (향후 논의)

| # | 아이디어 | 기대 효과 | 예상 시점 |
|---|----------|-----------|-----------|
| 1 | QR코드 출퇴근 체크인 — 현장 QR 스캔으로 출퇴근 기록 | 정확한 근무시간, 급여 계산 정확도 | Phase 3 |
| 2 | 구직자 평점 시스템 — 관리자가 근무 태도 평가, 우수 인력 뱃지 | 인력 품질 관리, 우수 인력 재배치 | Phase 2~3 |
| 3 | 카카오 알림톡 — 공고 매칭, 승인, 급여 지급 자동 알림 | 커뮤니케이션 효율화, 이탈 방지 | Phase 1~2 |
| 4 | AI 인력 매칭 — 이력서 + 근무이력 기반 최적 인력 추천 | 배치 시간 단축, 고객 만족도 | Phase 4 |
| 5 | 다국어 지원 — 외국인 근로자용 베트남어/중국어/영어 | 외국인 인력 풀 확대 | Phase 4 |
| 6 | 간편 일당 지급 — 토스/카카오페이 연동 실시간 지급 | 구직자 만족도 극대화 | Phase 3~4 |
| 7 | 고객사 셀프 포털 — 고객사가 직접 인력 요청, 현황 확인 | 관리자 업무 경감 | Phase 4 |

---

## 14. 다음 단계 (Next Steps)

1. **PRD 최종 리뷰** — 이 문서 기반으로 우선순위와 범위 최종 확정
2. **와이어프레임 설계** — 핵심 화면 (랜딩, 채용공고 카드, 마이페이지, 관리자) Figma 설계
3. **Supabase 프로젝트 셋업** — DB 스키마 마이그레이션, Auth 설정, Storage 버킷
4. **구글시트 연동 PoC** — Google Sheets API 연동 프로토타입
5. **MVP 스프린트 시작** — Phase 1 백로그 작성, Claude Code로 개발 착수
6. **법률 검토** — 전자서명 법적 효력, 개인정보처리방침, 근로기준법 준수 확인

---

*Humend HR — 인력과 기업을 잇다.*

# Architecture Decision Records (ADR)

프로젝트의 주요 기술 결정사항을 기록합니다. 각 ADR은 결정의 배경, 선택지, 최종 결정 및 결과를 포함합니다.

---

## ADR-001: Supabase (Auth + DB + Storage + RLS)

**상태**: 채택 (2026-02-11)

### 배경
MVP를 빠르게 출시하기 위해 백엔드 인프라를 최소화하면서도 인증, 데이터베이스, 파일 스토리지를 모두 지원하는 솔루션이 필요했음.

### 선택지
1. **Supabase** - Auth + PostgreSQL + Storage + RLS 통합
2. **Firebase** - Google 생태계, NoSQL 기반
3. **직접 구축** - Express/NestJS + PostgreSQL + JWT

### 결정
**Supabase** 채택.

### 근거
- PostgreSQL 기반으로 관계형 데이터 모델에 적합 (회원-지원-급여 관계)
- RLS(Row Level Security)로 클라이언트에서 직접 쿼리하면서도 데이터 보안 유지
- Supabase Auth가 전화번호 OTP, 이메일/비밀번호, OAuth를 모두 지원
- Next.js Server Components/Actions와 서버 클라이언트(`createClient`) 호환이 우수
- 무료 티어에서 MVP 운영 가능

### 결과
- 14개 마이그레이션 파일로 스키마 관리 (`supabase/migrations/`)
- 클라이언트용(`client.ts`), 서버용(`server.ts`), 미들웨어용(`middleware.ts`) 3종 Supabase 클라이언트
- 관리자는 `admins` 테이블 존재 여부로 권한 판별, service role key는 서버 전용

---

## ADR-002: Capacitor 하이브리드 앱 아키텍처

**상태**: 채택 (2026-02-20)

### 배경
웹 플랫폼을 Android 앱으로 확장할 필요가 있었음. 기존 Next.js 코드를 최대한 재사용하면서 네이티브 기능(푸시 알림, Google 로그인)을 지원해야 했음.

### 선택지
1. **Capacitor** - 웹뷰 기반 하이브리드, 네이티브 플러그인 지원
2. **React Native** - 네이티브 UI, 코드 재작성 필요
3. **PWA** - 별도 앱 없이 웹만으로 운영

### 결정
**Capacitor** 채택, `app-native` 오버레이 패턴 사용.

### 근거
- 기존 Next.js 코드베이스를 `next export`(정적 빌드)로 그대로 사용
- `src/app-native/` 디렉토리에 앱 전용 페이지를 오버레이하여 웹/앱 분리
- PWA는 푸시 알림, 구글 로그인 등 네이티브 기능 지원이 제한적
- React Native은 전체 UI 재작성이 필요하여 비용 과다

### 구조
```
src/app-native/          # 앱 전용 페이지 (Capacitor 빌드 시 app/ 대체)
  ├── layout.tsx         # 앱 전용 레이아웃 (뷰포트 제어, 글자 크기 조정)
  ├── login/             # 앱 전용 로그인 (구글 네이티브 Auth)
  ├── jobs/              # 앱 전용 일자리 목록/상세
  ├── my/                # 앱 전용 마이페이지
  └── signup/            # 앱 전용 회원가입

src/lib/native-api/      # 앱 전용 API 레이어
  ├── auth.ts            # 앱용 인증 (Capacitor Preferences 기반)
  ├── auth-guard.tsx     # 앱용 인증 가드 컴포넌트
  ├── queries.ts         # 앱용 DB 쿼리 (browser client 사용)
  └── actions.ts         # 앱용 Server Actions 대체

scripts/build-capacitor.sh  # 빌드 스크립트 (next export → Capacitor sync)
capacitor.config.ts         # Capacitor 설정 (appId: com.humend.hr)
```

### 결과
- 웹과 앱이 동일 컴포넌트를 공유하면서 앱 전용 동작만 분기
- Google Play 심사 대응을 위해 로컬 번들 로드 방식 사용 (서버 URL 제거)
- `NativeAppProvider` 컴포넌트로 앱 환경 감지 및 상태 관리

---

## ADR-003: 구글 OAuth 구현 방식

**상태**: 채택 (2026-02-21)

### 배경
전화번호 + 비밀번호 외에 소셜 로그인 옵션이 필요했음. 웹과 Capacitor 앱에서 동시에 작동해야 했음.

### 선택지
1. **Supabase OAuth (PKCE)** - Supabase 내장 OAuth
2. **웹: code redirect + 앱: Capacitor 네이티브 플러그인** - 환경별 분리
3. **웹/앱 모두 시스템 브라우저 OAuth** - 단일 방식

### 결정
**환경별 분리** 방식 채택.

### 구현
- **웹**: `signInWithOAuth({ provider: 'google' })` → code redirect 방식
  - Supabase가 Google OAuth 흐름을 처리, 콜백 URL로 리다이렉트
- **앱**: `@codetrix-studio/capacitor-google-auth` 네이티브 플러그인
  - 앱 내 Google 로그인 UI → ID 토큰 획득 → `signInWithIdToken()`으로 Supabase 세션 생성

### 근거
- 앱에서 시스템 브라우저 OAuth는 UX가 불안정 (브라우저 전환, 딥링크 실패)
- 네이티브 플러그인이 앱 내에서 Google 로그인 시트를 직접 표시하여 UX 우수
- 웹에서는 Supabase 기본 OAuth가 가장 안정적

### 환경변수
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth 클라이언트 ID (웹 + 앱 공용)

---

## ADR-004: 급여 시스템 (Google Sheets → DB Import)

**상태**: 채택 (2026-02-14)

### 배경
관리자가 Google Sheets에서 급여를 관리하고 있었으며, 이를 DB로 가져와야 했음. 기존 워크플로우를 최대한 유지하면서 시스템을 연동해야 했음.

### 결정
**Google Sheets → DB Import** 방식 채택.

### 흐름
```
1. 관리자가 Google Sheets에서 급여 데이터 작성/수정
2. 관리자 페이지에서 "시트 동기화" 버튼 클릭
3. Google Sheets API로 데이터 읽기
4. "지급" 상태인 행만 work_records/payments 테이블에 Import
5. 미등록 근무기록은 자동 생성
6. 수정된 행만 업데이트 (중복 방지)
```

### 기술 구현
- `src/lib/google/sheets.ts` - Google Sheets API 연동 (googleapis)
- Google Service Account 인증: Base64 JSON 키 방식 (Vercel 서버리스 호환)
- 환경변수: `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`, `GOOGLE_SPREADSHEET_ID`

### 결과
- 관리자의 기존 스프레드시트 워크플로우를 유지하면서 DB 연동
- Vercel 서버리스 환경에서의 Google 인증 문제 해결 (파일 → Base64 환경변수)

---

## ADR-005: 전자서명 + PDF 계약서

**상태**: 채택 (2026-02-12)

### 배경
근무 완료 후 회원이 계약서에 서명하고 PDF로 저장/조회할 수 있어야 했음.

### 결정
**signature_pad + jspdf** 조합 채택.

### 구현
- **서명**: `signature_pad` 라이브러리로 캔버스 기반 터치/마우스 서명
- **PDF 생성**: `jspdf`로 계약서 PDF 동적 생성 (근무 정보 + 서명 이미지 포함)
- **저장**: 서명 데이터(base64 이미지)를 DB에 저장, PDF는 클라이언트에서 실시간 생성

### 근거
- 서버사이드 PDF 생성 대비 클라이언트 생성이 서버 부하 없음
- signature_pad는 모바일 터치에 최적화
- 서명 이미지만 DB 저장, PDF는 필요 시 재생성하여 스토리지 절약

### 관련 파일
- `src/components/signature/` - 서명 패드 컴포넌트
- `src/lib/pdf/generate-contract.ts` - 계약서 PDF 생성 로직

---

## ADR-006: 파일 업로드 (Vercel Blob Storage)

**상태**: 채택 (2026-02-16)

### 배경
프로필 사진 업로드 시 안정적인 스토리지가 필요했음. Supabase Storage와 Vercel Blob Storage 간 선택이 필요했음.

### 선택지
1. **Supabase Storage** - Supabase 통합, RLS 적용 가능
2. **Vercel Blob Storage** - Vercel 호스팅과 최적 통합, CDN 포함

### 결정
**Vercel Blob Storage** 채택 (프로필 사진), Supabase Storage 병행 (고객사 사진).

### 근거
- Vercel에 배포하므로 Blob Storage가 네트워크 지연 최소화
- CDN 자동 포함으로 이미지 로딩 속도 우수
- 프로필 사진 URL을 직접 DB에 저장하여 조회 단순화
- 고객사 사진은 Supabase Storage + RLS로 접근 제어

### 환경변수
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage 토큰

### 관련 파일
- `src/app/api/upload-profile/` - 프로필 사진 업로드 API (Vercel Blob)
- `src/app/api/upload/` - 일반 파일 업로드 API

---

## ADR-007: 모바일 글자 크기 전략

**상태**: 채택 (2026-02-28)

### 배경
모바일 화면에서 글자가 너무 크게 표시되어 정보 밀도가 낮았음. 웹과 앱에서 각각 다른 글자 크기 전략이 필요했음.

### 결정
**CSS 미디어쿼리 + 앱 전용 오버레이** 방식 채택.

### 구현
```css
/* 모바일 웹: 글로벌 CSS에서 미디어쿼리 적용 */
@media (max-width: 640px) {
  html { font-size: 85%; }       /* 전체 15% 축소 */
  footer { font-size: 0.60em; }  /* 푸터 추가 축소 */
}
```
```tsx
/* 앱: app-native/layout.tsx에서 추가 축소 */
<div className="text-[80%]">
  <Footer />
</div>
```

### 근거
- rem 기반 디자인이므로 `html` 루트 font-size 조정으로 전체 비례 축소 가능
- 앱은 WebView 특성상 추가 축소 필요 (시스템 폰트 크기 영향)
- 푸터는 보조 정보이므로 더 작은 크기가 적절
- 미디어쿼리 방식으로 서버 사이드 렌더링에도 호환

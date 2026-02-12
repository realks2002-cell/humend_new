# UI Enhancement Plan - Humend HR

## Overview
Phase 2 구현 완료 후, 전체 페이지의 디자인/UI/기능을 고도화합니다.
페이지별로 하나씩 개선하여 사용성과 완성도를 높입니다.

## Current State
- 20개 페이지, 15개 shadcn/ui 컴포넌트, 4개 커스텀 컴포넌트
- 기본적인 반응형 디자인 완성
- 최소한의 애니메이션 (transition-colors, hover:shadow-md 정도)
- Toast/알림 시스템 없음
- 빈 상태 표현이 텍스트 위주
- 차트/데이터 시각화 없음
- 이미지 플레이스홀더가 단색 회색 블록

## Enhancement Areas (7 Steps)

### Step 1: Toast 알림 시스템 + Sonner 도입
- **목표**: 사용자 액션에 대한 시각적 피드백 제공
- **설치**: `npx shadcn@latest add sonner`
- **적용 대상**:
  - 로그인/회원가입 성공/실패
  - 지원 신청 성공/실패 (ApplyButton)
  - 급여 확정/지급완료 일괄 처리 (PayrollTable)
  - 전자서명 완료 (SalaryDetail)
  - Google Sheets 내보내기/가져오기 (SheetsSync)
  - 이력서 저장 성공
- **수정 파일**: layout.tsx (Toaster 추가), 각 액션 컴포넌트

### Step 2: 랜딩 + 소개 페이지 비주얼 고도화
- **목표**: 첫인상 강화, 브랜드 신뢰감 전달
- **개선 사항**:
  - Hero: 배경 그라데이션 강화 + 애니메이션 텍스트
  - Stats 카운터: 숫자 올라가는 애니메이션 (CountUp 효과, CSS only)
  - Service 카드: 아이콘 추가 + hover scale 효과
  - 채용공고 카드: 이미지 플레이스홀더 → 아이콘+텍스트 디자인
  - About: 프로세스 스텝 → 연결선 + 스텝별 색상
  - CTA 섹션: 배경 강화
- **수정 파일**: page.tsx, about/page.tsx

### Step 3: 채용공고 페이지 UX 개선
- **목표**: 공고 탐색 효율성 향상
- **개선 사항**:
  - 검색 필터 추가 (지역, 날짜 범위)
  - 카드 이미지 영역 → 고객사 로고/아이콘 + 그라데이션 배경
  - 날짜 슬롯 뱃지 색상 분류 (오늘/이번주/다음주)
  - 모집 마감 임박 표시
  - 빈 상태 → 일러스트 아이콘 + CTA
  - 지원 성공 시 confetti/celebration 효과 (toast로 대체 가능)
- **수정 파일**: jobs/page.tsx, jobs/[id]/page.tsx, ApplyButton.tsx

### Step 4: 로그인/회원가입 폼 UX 개선
- **목표**: 폼 입력 경험 개선
- **개선 사항**:
  - 전화번호 자동 포맷팅 (010-1234-5678)
  - 비밀번호 입력 시 숫자 키패드 힌트 강화
  - 에러 메시지 애니메이션 (슬라이드 인)
  - 로그인 카드에 브랜드 로고/일러스트
  - 회원가입 성공 → 자동 로그인 유도 or 카운트다운 리다이렉트
  - 입력 필드 포커스 시 라벨 애니메이션
- **수정 파일**: login/page.tsx, signup/page.tsx

### Step 5: 마이페이지 대시보드 리디자인
- **목표**: 회원 대시보드 정보 밀도 + 시각적 풍성함 향상
- **개선 사항**:
  - 프로필 카드: 아바타 + 이름 + 가입일 + 완성도 프로그레스바
  - 요약 카드: 아이콘 색상 + 배경 그라데이션
  - 퀵링크: hover 시 아이콘 애니메이션 (scale/color)
  - 다가오는 근무: 타임라인 스타일 + D-day 뱃지
  - 급여 요약 위젯 추가 (이번 달 예상 수령액)
- **수정 파일**: my/page.tsx

### Step 6: 관리자 대시보드 차트 + 통계 강화
- **목표**: 한눈에 현황 파악, 데이터 기반 의사결정 지원
- **개선 사항**:
  - 설치: `npx shadcn@latest add chart` (Recharts 기반)
  - 월별 급여 추이 Bar Chart
  - 지원 현황 Pie/Donut Chart (대기/승인/거절)
  - 스탯 카드 hover 효과 강화
  - 미처리 지원 목록 → 바로 승인/거절 버튼 추가
  - 최근 활동 타임라인
- **수정 파일**: admin/page.tsx, 새로운 차트 컴포넌트

### Step 7: 공통 UI 폴리싱
- **목표**: 전반적인 마감 품질 향상
- **개선 사항**:
  - Tooltip 추가: 아이콘 버튼에 설명 (npx shadcn@latest add tooltip)
  - 스크롤 시 Header shadow 효과
  - 페이지 전환 트랜지션 (CSS animate-in)
  - 관리자 사이드바 접기/펼치기 토글
  - 404 페이지 디자인
  - 전체적 일관성 검토 + 미세 조정
- **수정 파일**: Header.tsx, admin/layout.tsx, not-found.tsx 등

## npm Packages
```bash
npx shadcn@latest add sonner tooltip chart
```

## Priority Order
1. Step 1 (Toast) - 모든 페이지에 기반이 되는 인프라
2. Step 2 (Landing) - 첫인상 = 가장 큰 임팩트
3. Step 5 (My Dashboard) - 회원이 가장 많이 보는 페이지
4. Step 6 (Admin Dashboard) - 관리자 핵심 페이지
5. Step 3 (Jobs) - 핵심 비즈니스 플로우
6. Step 4 (Login/Signup) - 전환율 개선
7. Step 7 (Polish) - 마감 품질

## Success Criteria
- 모든 사용자 액션에 Toast 피드백
- 빈 상태에 적절한 아이콘 + 안내 메시지
- 관리자 대시보드에 최소 2개 차트
- 모든 페이지 모바일 반응형 정상 동작
- npm run build 성공
- Playwright E2E 28/28 통과

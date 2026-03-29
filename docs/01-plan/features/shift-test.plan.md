# 근무 테스트 페이지 리뉴얼

## 배경

기존 `/admin/test` 페이지는 구글맵 기반 위치추적 방식으로 만들어졌으나, 현재 시스템은 **지오펜싱 + FCM 자동알림** 방식으로 변경됨. 테스트 페이지를 현재 흐름에 맞게 리뉴얼 필요.

## 목표

공고 등록/고객사 관리와 **별도로** 근무 배정 → FCM 알림 → 지오펜싱 출근 확인 전체 흐름을 테스트할 수 있는 페이지

## 기능 요구사항

### 1. 테스터 관리
- 앱 설치 + 알림 허용한 실제 회원 등록/삭제
- `device_tokens` 존재 여부 표시 (FCM 수신 가능 여부)
- 테스트 푸시 발송 버튼 (기존 `sendTestPushToMember` 재사용)

### 2. 테스트 근무지 등록
- 주소 검색 → 좌표 저장 (Google Maps Geocoding)
- `clients` 테이블에 `is_test: true`로 저장 (기존 고객사와 구분)
- 근무지 목록 표시 + 삭제

### 3. 테스트 배정
- 근무지 + 테스터 + 시간 선택
- **알림 설정**: `alert_minutes_before`, `alert_interval_minutes`, `alert_max_count` 직접 지정
- 배정 시 FCM 발송 확인 (await 적용된 새 코드)

### 4. FCM 알림 모니터
- 배정 FCM 발송 결과 표시
- cron 재알림 발송 이력 (`notification_logs` 조회)
- **수동 cron 트리거 버튼** — 로컬/프로덕션 모두에서 즉시 cron 실행 가능
- 회원별 푸시 진단 (`diagnosePushStatus` 재사용)

### 5. 상태 모니터링
- 테스터별 `arrival_status` 실시간 표시 (5초 폴링)
  - `pending` → `notified` → `confirmed` → `arrived` / `noshow`
- 상태 변경 타임라인 (언제 notified 됐는지, confirmed 됐는지)
- 일괄 상태 초기화 버튼 (`resetTestShifts` 재사용)

## 재사용 가능한 기존 코드

| 함수 | 파일 | 용도 |
|------|------|------|
| `createTestShift` | `admin/test/actions.ts` | 테스트 배정 생성 |
| `deleteTestShift` | `admin/test/actions.ts` | 배정 삭제 |
| `addTestMember` | `admin/test/actions.ts` | 테스터 등록 |
| `removeTestMember` | `admin/test/actions.ts` | 테스터 삭제 |
| `diagnosePushStatus` | `admin/test/actions.ts` | FCM 진단 |
| `sendTestPushToMember` | `admin/test/actions.ts` | 테스트 푸시 |
| `resetTestShifts` | `admin/test/actions.ts` | 배정 초기화 |
| `cleanupTestClients` | `admin/test/actions.ts` | 테스트 근무지 정리 |
| `getTestShifts` | `admin/test/actions.ts` | 오늘 배정 조회 |
| `getTestMembers` | `admin/test/actions.ts` | 테스터 목록 |

## 수정 필요 사항

### actions.ts 수정
- `createTestShift`에 알림 설정 파라미터 추가 (`alert_minutes_before`, `alert_interval_minutes`, `alert_max_count`)
- `createTestShift`의 FCM 호출도 `await` 방식으로 수정 (현재 `.catch(console.error)`)
- 수동 cron 트리거 액션 추가
- 테스터 조회를 `SEED_MEMBERS` 하드코딩이 아닌 `is_test` 플래그 또는 별도 테이블로 관리

### test-client.tsx 전체 리뉴얼
- 구글맵/위치시뮬레이션 코드 제거
- 현재 흐름에 맞는 UI 재구성:
  - 테스터 카드 (FCM 상태 표시)
  - 근무지 카드 (주소 + 좌표)
  - 배정 + 알림설정 폼
  - 상태 모니터 (폴링)
  - 알림 타임라인

## 제거 대상
- 위치 시뮬레이션 함수 (`sendTestLocation`, `sendBatchSimLocations`)
- 구글맵 지도 렌더링
- 30명 일괄 배정 (불필요)

## 수정 파일

| 파일 | 변경 |
|------|------|
| `src/app/admin/test/actions.ts` | 알림 설정 파라미터 추가, cron 트리거, FCM await |
| `src/app/admin/test/test-client.tsx` | 전체 리뉴얼 |
| `src/app/admin/test/page.tsx` | 필요시 데이터 fetch 수정 |

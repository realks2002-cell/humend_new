# 근무 이탈 감지 기능

## 배경

현재 지오펜싱은 출근 확인(도착)만 수행하고, 도착 후 watch를 중단함. 근무 시간 중 근무지에서 이탈하는 것을 감지하고 기록하는 기능이 없음.

## 목표

근무지 도착(`arrived`) 후에도 지오펜싱을 유지하여, 근무지에서 **500m 이상 이탈** 시 이탈 시간을 기록하고 복귀 시 복귀 시간을 기록한다.

## 기능 요구사항

### 1. 이탈 감지 (앱 클라이언트)

- `arrived` 후 watch를 중단하지 않고 **계속 유지**
- 근무지에서 500m(`DEPARTURE_RADIUS`) 이상 벗어나면 이탈 API 호출
- 다시 500m 이내로 복귀하면 복귀 API 호출
- 근무 종료 시간(`end_time`) 도달 시 watch 자동 중단

### 2. 이탈 기록 (DB)

**새 테이블: `departure_logs`**

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| shift_id | UUID | FK → daily_shifts |
| member_id | UUID | FK → members |
| departed_at | TIMESTAMPTZ | 이탈 시각 |
| returned_at | TIMESTAMPTZ | 복귀 시각 (NULL이면 아직 이탈 중) |
| departed_lat | FLOAT | 이탈 위치 좌표 |
| departed_lng | FLOAT | 이탈 위치 좌표 |
| duration_minutes | INT | 이탈 시간(분) — 복귀 시 자동 계산 |
| created_at | TIMESTAMPTZ | 생성 시각 |

### 3. API 엔드포인트

- `POST /api/native/attendance/depart` — 이탈 기록 생성
  - body: `{ shiftId, lat, lng }`
  - 응답: `{ departureId }`

- `POST /api/native/attendance/return` — 복귀 기록 업데이트
  - body: `{ shiftId }`
  - `departed_at`이 NULL이 아닌 가장 최근 레코드의 `returned_at` 업데이트 + `duration_minutes` 계산

### 4. 관리자 화면

- `/admin/shifts` 카드에 이탈 이력 표시
  - 이탈 횟수, 총 이탈 시간
  - 현재 이탈 중이면 빨간 배지 표시
- 이탈 상세 보기 (모달): 이탈/복귀 시각 타임라인

### 5. 알림 (선택)

- 이탈 감지 시 관리자에게 FCM 푸시 (선택 설정)
- 회원에게도 "근무지를 이탈했습니다" 알림

## 지오펜싱 흐름 변경

```
현재:
pending → notified → confirmed → arrived → [watch 중단]

변경:
pending → notified → confirmed → arrived → [watch 계속]
                                    ↓
                              500m 이탈 → depart API → [이탈 기록]
                                    ↓
                              500m 복귀 → return API → [복귀 기록]
                                    ↓
                              end_time → [watch 중단]
```

## 수정 대상 파일

| 파일 | 변경 |
|------|------|
| `src/lib/capacitor/geofence.ts` | arrived 후 watch 계속 + 이탈/복귀 콜백 추가 |
| `src/hooks/useAttendance.ts` | depart/return API 호출 로직 추가 |
| `src/app/api/native/attendance/depart/route.ts` | 새 API |
| `src/app/api/native/attendance/return/route.ts` | 새 API |
| `supabase/migrations/xxx_departure_logs.sql` | 새 테이블 |
| `src/app/admin/shifts/shift-table.tsx` | 이탈 이력 표시 |

## 백그라운드 동작

현재 `@capacitor-community/background-geolocation` 플러그인이 Android foreground service로 동작하므로 앱이 백그라운드에 있어도 위치 감지가 유지됨. 이탈 감지도 동일하게 백그라운드에서 동작.

### 백그라운드 보장 사항
- **foreground service 알림**: "휴먼드 출근확인 — 근무 중 위치를 확인하고 있습니다" (arrived 후 문구 변경)
- **앱 스와이프(최근 앱 제거)**: foreground service 유지 → 이탈 감지 계속 동작
- **앱 강제 종료(force stop)**: watch 중단됨 → 다음 앱 실행 시 자동 재시작 필요
- **화면 꺼짐/잠금**: 정상 동작 (foreground service)

### 앱 재시작 시 자동 복구
- `useAttendance` 훅에서 앱 실행 시 `arrived` 상태인 shift가 있으면 → 이탈 감지 watch 자동 재시작
- 이미 이탈 중(`departure_logs`에 `returned_at` NULL 레코드 존재)이면 → 이탈 상태 유지 + watch 재시작

### 배터리 최적화 대응
- 회원에게 **배터리 최적화 제외** 안내 (삼성/샤오미/화웨이 등)
- 앱 최초 실행 시 배터리 최적화 제외 요청 다이얼로그 표시 가능 (Capacitor `@nicerss/capacitor-ignore-battery-optimizations` 또는 직접 Intent)

## 고려 사항

- **배터리**: arrived 후에도 watch를 유지하므로 배터리 소모 증가. `distanceFilter`를 200~500m로 설정하여 최소화
- **정확도**: GPS 오차로 인한 오탈감지 방지 — 연속 2회 이상 500m 초과 시에만 이탈 판정 (`debounce`)
- **근무 종료**: `end_time` 이후 자동 watch 중단 필요 — 타이머 또는 cron에서 체크
- **앱 코드 변경**: APK 재빌드 필요
- **동의 문구 업데이트**: 이탈 감지 추가에 따라 위치 수집 설명 업데이트 필요 ("근무 시간 중 근무지 이탈 여부 확인 포함")

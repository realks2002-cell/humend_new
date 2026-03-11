# HumendHR — 출근 위치추적 · 노쇼/지각 사전 판별 기능 PRD

> Product Requirements Document v1.1 | 2026.03  
> 연동 앱: HumendHR (로컬번들 하이브리드앱) | 백엔드: Supabase | 배포: Android / iOS

---

## ⚠️ 전제 조건 (Claude Code 필독)

이 PRD는 **이미 운영 중인 HumendHR 앱**에 위치추적 기능을 추가하는 작업이다.

**기존 앱 현황**
- 로컬번들 하이브리드앱 (이미 빌드·배포 완료)
- 기존 구현 기능: 회원 로그인, 채용공고 조회, 지원, 급여신청
- 백엔드: Supabase (기존 스키마 운영 중)

**절대 원칙**
- 기존 컴포넌트, 페이지, 함수는 **절대 수정하지 말 것**
- 기존 Supabase 테이블 구조는 **절대 변경하지 말 것**
- 기존 `auth.users`, `workplaces` 등 테이블은 **참조(JOIN)만 할 것**
- 이 PRD의 기능은 기존 앱에 **add-on 방식으로만 추가**할 것

**신규 추가 대상만**
- Supabase 신규 테이블: `daily_shifts`, `location_logs` (2개만)
- Capacitor 플러그인 추가 설치
- 신규 페이지/컴포넌트 추가 (기존 파일 수정 없이)
- FCM 푸시 설정 추가
- Supabase Edge Function 및 pg_cron 추가

---

## 1. 개요 및 목적

### 1.1 배경

HumendHR은 회원이 채용공고를 확인·지원·급여신청하는 임시직 플랫폼이다.  
웨딩·케이터링 등 당일 근무 특성상 노쇼(No-Show) 발생 시 현장 운영에 심각한 차질이 생긴다.  
하루에 **다수의 근무지**가 동시 운영될 수 있으며, 처음 방문하는 장소를 찾지 못해 지각하는 사례도 빈번하다.  
**노쇼·지각이 실제로 발생하기 전에 사전 판별**하여 선제적으로 대응하는 것이 핵심 과제다.

### 1.2 목적

- **노쇼 사전 판별**: 출근 2시간 전부터 미이동·연락두절 회원을 조기 감지
- **지각 사전 판별**: 현재 위치·이동 속도 기반으로 지각 가능성을 출근 전에 예측
- **길 안내 지원**: 근무지를 찾지 못하는 회원에게 관리자가 선제 연락
- **출근 확인 자동화**: 지오펜스 도착 감지로 출근 처리 자동화
- **다수 근무지 동시 관리**: 당일 여러 근무지를 한 화면에서 탭/필터로 분리 관리
- **배터리 최적화**: 도착 확인 즉시 위치추적 자동 종료

### 1.3 핵심 원칙

> **위치 수집 범위**: 출근 2시간 전 ~ 본인 배정 근무지 도착 확인까지만.  
> 도착 즉시 자동 종료. **근무 중 추적 없음.**  
> 각 회원은 자신이 배정된 근무지 기준으로 개별 지오펜싱 판별.

---

## 2. 이해관계자

| 역할 | 설명 | 주요 관심사 |
|------|------|------------|
| 관리자 | 근무표 작성 및 현장 운영 책임자 | 노쇼/지각 사전 감지, 다수 근무지 동시 파악 |
| 근무 회원 | 근무 배정 후 현장으로 이동하는 알바생 | 개인정보 보호, 배터리 소모 최소화 |
| 앱 운영사 | HumendHR 플랫폼 운영팀 | 앱스토어 정책 준수, 법적 리스크 관리 |

---

## 3. 기능 요구사항

### 3.1 관리자 — 근무표 등록 (전날 입력)

관리자는 근무 **전날**, 당일 운영될 **모든 근무지**에 대해 각각 회원 명단을 등록한다.  
당일 근무지는 복수(N개)이며, 근무지마다 출근 시간과 배정 회원이 다를 수 있다.

**근무표 등록 흐름**

```
1. 근무일 선택
2. 근무지 추가 (Supabase workplaces 테이블에서 검색·선택, N개 추가 가능)
3. 근무지별 출근 시간 설정
4. 근무지별 배정 회원 선택 (다중 선택)
5. 저장
   → 배정된 회원 전체에게 FCM 푸시 발송
   → 출근 2시간 전 알림 자동 스케줄 등록 (pg_cron)
```

**근무표 기능 상세**

| 기능 | 상세 |
|------|------|
| 근무지 다중 등록 | 하루에 N개 근무지 동시 등록 가능 |
| 회원 중복 배정 방지 | 동일 회원이 같은 날 2곳 배정 시 경고 표시 |
| 근무표 수정/삭제 | 근무 당일 출근 2시간 전까지 수정 가능 |
| 배정 취소 | 개별 회원 배정 취소 시 해당 회원 알림 발송 |

---

### 3.2 회원 앱 — 위치추적 활성화 흐름

| 단계 | 트리거 | 동작 |
|------|--------|------|
| STEP 1 | 출근 2시간 30분 전 | FCM 푸시: "오늘 [근무지명] 근무가 있습니다. 앱을 실행해주세요 📍" |
| STEP 2 | 출근 2시간 전 (앱 실행 중) | 위치추적 자동 활성화 + Android 상단 알림바 표시 |
| STEP 3 | 이동 중 | 10~15분 간격 위치 수집 → Supabase `location_logs` 저장 |
| STEP 4 | 근무지 반경 10m 진입 | 지오펜스 도착 감지 → 출근 완료 처리 |
| STEP 5 | 도착 확인 즉시 | 위치추적 자동 종료 + 회원에게 "출근 완료" 알림 |

**앱 미실행 대응 (이중 안전장치)**

- 출근 2시간 30분 전 FCM 푸시 → 탭 시 앱 실행 + 추적 자동 시작
- 앱 실행 중: `@capacitor-community/background-runner`로 백그라운드 추적 유지
- Android: Foreground Service로 앱 강제 종료 방지
- iOS: Significant Location Changes 모드 병행

---

### 3.3 노쇼 · 지각 사전 판별 기능 ⭐

출근 시간이 되기 **전에** 위험 회원을 자동 감지하여 관리자가 선제 대응할 수 있도록 한다.

#### 판별 단계 및 자동 액션

| 판별 단계 | 시점 | 조건 | 위험 등급 | 자동 액션 |
|----------|------|------|----------|----------|
| 노쇼 위험 1단계 | 출근 2시간 전 | 앱 미실행 OR 위치 수신 없음 | 🟡 주의 | 관리자 알림: "앱 미실행 회원 N명" |
| 노쇼 위험 2단계 | 출근 1시간 전 | 최근 1시간 이동 거리 500m 미만 | 🟠 경고 | 관리자 알림 + 해당 회원에게 재알림 발송 |
| 노쇼 위험 3단계 | 출근 30분 전 | 여전히 미이동 + 근무지까지 3km 초과 | 🔴 위험 | 관리자 즉시 알림 + 대타 검색 버튼 활성화 |
| 지각 예측 | 출근 20분 전 | 예상 도착 시간 > 출근 시간 | 🟠 경고 | 관리자 알림: "예상 도착 HH:MM (N분 지각)" |
| 노쇼 확정 | 출근 시간 +30분 | 여전히 미도착 | ⛔ 노쇼 | 노쇼 확정 처리 + 대타 공고 즉시 등록 버튼 |

#### 도착 예상 시간 계산 방법

```
예상 도착 시간 = 현재 시각 + (근무지까지 직선 거리 ÷ 이동 속도)

이동 속도 추정:
- 최근 2개 위치 로그의 거리 / 시간 차이로 실시간 계산
- 위치 로그 1개만 있는 경우: 기본값 도보 4km/h (1.1m/s) 적용
- 속도 30km/h 이상 감지 시: 대중교통/차량 이동으로 판단

※ 직선 거리 기반이므로 실제보다 빠르게 표시될 수 있음
※ 안전 마진 +10분 적용 권장 (현장 운영 경험 기반 조정)
```

#### 미이동 판별 로직

```
[Supabase Edge Function: detect_noshow_risk()]

1. pg_cron이 매 시간 정각에 실행
2. 당일 배정된 전체 daily_shifts 조회
3. 각 회원의 location_logs 확인:
   - 로그 없음           → "앱 미실행" 상태
   - 1시간 전후 거리 계산 → 500m 미만이면 "미이동" 상태
   - 500m 이상           → "이동 중" 정상
4. 위험 등급 산정 → 관리자에게 FCM 발송
```

#### 관리자 수신 알림 예시

```
[출근 1시간 전]
🟠 HumendHR 노쇼 경고
───────────────────────
📍 강남 웨딩홀 A (출근 10:00)
⚠️ 미이동 회원: 김철수, 이영희
💤 앱 미실행 회원: 박민준
→ [앱에서 확인하기]

[출근 20분 전]
🔴 HumendHR 지각 예상
───────────────────────
📍 강남 웨딩홀 A (출근 10:00)
🕐 최지은 — 예상 도착 10:18 (18분 지각 예상, 현재 2.1km)
🚨 박민준 — 위치 불명 (직접 연락 필요)
→ [대타 검색하기]
```

---

### 3.4 관리자 대시보드 — 실시간 현황 (Google Maps)

관리자는 **Google Maps** 기반 지도에서 당일 배정된 모든 회원의 위치를 실시간으로 확인한다.

**화면 구성**

```
┌──────────────────────────────────────────┐
│  [전체] [강남 웨딩홀] [잠실 연회장] [+]  │ ← 근무지별 탭
├──────────────────────────────────────────┤
│                                          │
│             Google Maps                  │
│    📍근무지A              📍근무지B      │
│     🟢김xx  🔵이xx         🔴박xx ⚫최xx │
│                                          │
├──────────────────────────────────────────┤
│ ✅출근완료 2  🚶이동중 3                  │
│ 🟠지각예상 1  🔴노쇼위험 1  ⚫위치불명 1  │
└──────────────────────────────────────────┘
```

**회원 상태별 마커**

| 상태 | 조건 | 마커 색상 | 관리자 액션 |
|------|------|----------|------------|
| ✅ 출근 완료 | 근무지 10m 이내 도착 | 초록 | 자동 완료 |
| 🚶 이동 중 | 위치 수신 중, 정시 도착 예상 | 파랑 | 예상 도착 시간 확인 |
| 🟠 지각 예상 | 예상 도착 시간 > 출근 시간 | 주황 | 전화/문자 |
| 🔴 노쇼 위험 | 미이동 또는 앱 미실행 | 빨강 | 전화 + 대타 검색 |
| ⛔ 노쇼 확정 | 출근 +30분 미도착 | 진빨강 | 대타 공고 등록 |
| ⚫ 위치 불명 | GPS 꺼짐 | 회색 | 직접 연락 |

**마커 클릭 시 InfoWindow 표시**

- 회원 이름 / 연락처
- 현재 상태
- 근무지까지 직선 거리
- 예상 도착 시간
- 전화 바로 걸기 버튼
- 문자 보내기 버튼

**Google Maps 기술 구현**

```typescript
// 설치
npm install @react-google-maps/api

// 핵심 컴포넌트
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

// Supabase Realtime → 마커 실시간 갱신
supabase
  .channel('location_logs')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'location_logs'
  }, (payload) => updateMarker(payload.new))
  .subscribe();

// 근무지별 탭: workplace_id 기준으로 daily_shifts 필터링
const filteredShifts = activeTab === 'all'
  ? allShifts
  : allShifts.filter(s => s.workplace_id === activeTab);
```

---

### 3.5 자동화 알림 전체 타임라인

| 발송 시점 | 수신자 | 내용 |
|----------|--------|------|
| 출근 2시간 30분 전 | 배정 회원 전체 | 오늘 근무 안내 + 앱 실행 요청 |
| 출근 2시간 전 | 배정 회원 전체 | 위치추적 시작 안내 |
| 출근 2시간 전 | 관리자 | 앱 미실행 회원 목록 (노쇼 위험 1단계) |
| 출근 1시간 전 | 관리자 | 미이동 회원 목록 (노쇼 위험 2단계) |
| 출근 1시간 전 | 미이동 회원 | "출발하지 않으셨나요? 곧 출근 시간입니다" 재알림 |
| 출근 30분 전 | 관리자 | 노쇼 위험 3단계 + 대타 검색 버튼 |
| 출근 20분 전 | 관리자 | 지각 예상 회원 + 예상 도착 시간 |
| 출근 시간 +30분 | 관리자 | 노쇼 확정 회원 목록 |
| 출근 완료 | 해당 회원 | "출근 완료되었습니다. 위치추적이 종료됩니다." |

---

## 4. 비기능 요구사항

### 4.1 배터리 최적화

- 추적 활성 시간: 최대 2시간 (출근 2시간 전 ~ 도착 확인)
- 위치 수집 주기: 10~15분 간격 (연속 수집 금지)
- 도착 즉시 추적 자동 종료
- 기존 근태 앱(24시간 추적) 대비 약 85~90% 배터리 절약

### 4.2 플랫폼별 기술 요건

| 플랫폼 | 요건 | 구현 방법 |
|--------|------|----------|
| Android | 백그라운드 실행 유지 | Foreground Service + 상단 알림 표시 필수 |
| Android | 배터리 최적화 예외 | 최초 실행 시 설정 안내 화면 제공 |
| Android | 앱 완전 종료 대응 | FCM Silent Push로 앱 재실행 트리거 |
| iOS | 백그라운드 위치 수집 | Significant Location Changes 모드 병행 |
| iOS | App Store 심사 | NSLocationAlwaysUsageDescription 문구 필수 |
| 공통 | 이중 안전장치 | FCM 푸시 + 로컬 알람 동시 적용 |

### 4.3 성능 요건

- 위치 수집 → Supabase 저장 응답: 3초 이내
- 관리자 대시보드 마커 갱신: Supabase Realtime 이벤트 즉시 반영
- 노쇼 판별 Edge Function 실행: 10초 이내 완료
- 동시 추적 회원 수: 최소 200명 이상 지원

---

## 5. 데이터 설계 (Supabase)

### 5.1 신규 테이블

#### daily_shifts (일별 근무 배정표)

```sql
CREATE TABLE daily_shifts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_date       date NOT NULL,
  workplace_id    uuid REFERENCES workplaces(id),   -- 기존 근무지 테이블
  worker_id       uuid REFERENCES auth.users(id),   -- 기존 회원 테이블
  start_time      timestamptz NOT NULL,
  -- 출근 상태
  -- pending | moving | late_risk | noshow_risk | arrived | late | noshow
  arrival_status  varchar DEFAULT 'pending',
  arrived_at      timestamptz,
  -- 노쇼 판별용 캐시
  last_known_lat  numeric,
  last_known_lng  numeric,
  last_seen_at    timestamptz,
  noshow_alerted  boolean DEFAULT false,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

-- 동일 회원 하루 2곳 배정 방지
CREATE UNIQUE INDEX unique_worker_date
  ON daily_shifts(worker_id, work_date);
```

#### location_logs (위치 추적 로그)

```sql
CREATE TABLE location_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    uuid REFERENCES daily_shifts(id),
  worker_id   uuid REFERENCES auth.users(id),
  lat         numeric NOT NULL,
  lng         numeric NOT NULL,
  speed       numeric,   -- 이동 속도 (m/s), 지각 예측에 활용
  recorded_at timestamptz DEFAULT now()
);

-- PostGIS 활성화
CREATE EXTENSION IF NOT EXISTS postgis;

-- 최신 위치 빠른 조회용 인덱스
CREATE INDEX idx_location_logs_shift_time
  ON location_logs(shift_id, recorded_at DESC);
```

### 5.2 기존 테이블 활용

근무지 테이블(`workplaces`)의 위도/경도 컬럼을 그대로 참조. **기존 테이블 구조 변경 없음.**

> ⚠️ **확인 필요**: 실제 테이블명과 위도/경도 컬럼명을 기존 Supabase 스키마에서 확인 후 쿼리 반영.

### 5.3 핵심 쿼리

#### 도착 확인 (지오펜싱 10m 판별)

```sql
SELECT
  ds.id AS shift_id,
  ST_Distance(
    ST_MakePoint(ll.lng, ll.lat)::geography,
    ST_MakePoint(wp.lng, wp.lat)::geography
  ) AS distance_meters
FROM location_logs ll
JOIN daily_shifts ds ON ll.shift_id = ds.id
JOIN workplaces wp ON ds.workplace_id = wp.id
WHERE ll.shift_id = $1
  AND ll.recorded_at = (
    SELECT MAX(recorded_at) FROM location_logs WHERE shift_id = $1
  )
HAVING distance_meters < 10;  -- 10m 이내 = 도착 완료
```

#### 노쇼 위험 회원 조회 (최근 1시간 미이동 판별)

```sql
SELECT
  ds.id,
  ds.worker_id,
  ds.workplace_id,
  ds.start_time,
  COALESCE(
    ST_Distance(
      ST_MakePoint(recent.lng, recent.lat)::geography,
      ST_MakePoint(old.lng,    old.lat)::geography
    ), 0
  ) AS moved_distance_meters
FROM daily_shifts ds
LEFT JOIN LATERAL (
  SELECT lat, lng FROM location_logs
  WHERE shift_id = ds.id
  ORDER BY recorded_at DESC LIMIT 1
) recent ON true
LEFT JOIN LATERAL (
  SELECT lat, lng FROM location_logs
  WHERE shift_id = ds.id
    AND recorded_at <= now() - interval '1 hour'
  ORDER BY recorded_at DESC LIMIT 1
) old ON true
WHERE ds.work_date = CURRENT_DATE
  AND ds.start_time BETWEEN now() AND now() + interval '2 hours'
  AND ds.arrival_status = 'pending'
  AND (
    recent.lat IS NULL          -- 앱 미실행 (위치 로그 없음)
    OR moved_distance_meters < 500  -- 1시간 동안 500m 미만 이동
  );
```

#### 지각 예측 (예상 도착 시간 계산)

```sql
SELECT
  ds.worker_id,
  ds.start_time,
  ST_Distance(
    ST_MakePoint(ll.lng, ll.lat)::geography,
    ST_MakePoint(wp.lng, wp.lat)::geography
  ) AS distance_meters,
  CASE
    WHEN ll.speed > 0 THEN
      now() + ((
        ST_Distance(
          ST_MakePoint(ll.lng, ll.lat)::geography,
          ST_MakePoint(wp.lng, wp.lat)::geography
        ) / ll.speed
      ) * interval '1 second')
    ELSE
      now() + ((
        ST_Distance(
          ST_MakePoint(ll.lng, ll.lat)::geography,
          ST_MakePoint(wp.lng, wp.lat)::geography
        ) / 1.1   -- 기본 도보 속도 4km/h = 1.1m/s
      ) * interval '1 second')
  END AS estimated_arrival
FROM daily_shifts ds
JOIN LATERAL (
  SELECT lat, lng, speed FROM location_logs
  WHERE shift_id = ds.id
  ORDER BY recorded_at DESC LIMIT 1
) ll ON true
JOIN workplaces wp ON ds.workplace_id = wp.id
WHERE ds.work_date = CURRENT_DATE
  AND ds.arrival_status = 'pending';
```

### 5.4 Supabase pg_cron 자동화 스케줄

```sql
-- 매 시간 정각: 노쇼 위험 판별 실행
SELECT cron.schedule(
  'noshow-risk-check',
  '0 * * * *',
  $$ SELECT detect_noshow_risk(); $$
);

-- 매 5분: 지각 예측 상태 업데이트
SELECT cron.schedule(
  'late-prediction-update',
  '*/5 * * * *',
  $$ SELECT update_late_predictions(); $$
);
```

---

## 6. 기술 스택

| 영역 | 기술 | 용도 |
|------|------|------|
| 앱 프레임워크 | 기존 로컬번들 하이브리드앱 | 기존 앱에 플러그인 추가 방식 |
| 위치 수집 | `@capacitor/geolocation` | GPS 좌표 수집 |
| 백그라운드 실행 | `@capacitor-community/background-runner` | 앱 백그라운드 위치 추적 유지 |
| 로컬 알림 | `@capacitor/local-notifications` | 출근 전 자동 알람 스케줄 |
| 푸시 알림 | Firebase Cloud Messaging (FCM) | 서버 → 앱 트리거, 앱 깨우기 |
| DB / 백엔드 | Supabase (기존) | 위치 로그 저장, 근무표 관리 |
| 실시간 통신 | Supabase Realtime | 관리자 대시보드 마커 즉시 갱신 |
| 공간 쿼리 | PostGIS (Supabase 확장) | 지오펜싱 · 거리 · 도착 판별 |
| 노쇼/지각 판별 | Supabase Edge Functions | 서버사이드 위험 판별 로직 |
| 자동화 스케줄 | Supabase pg_cron | 정시 판별 및 알림 자동 실행 |
| 지도 (관리자) | Google Maps (`@react-google-maps/api`) | 실시간 회원 위치 시각화 |

---

## 7. 법적 · 정책 요건

### 7.1 한국 법령

| 항목 | 요건 | 구현 방법 |
|------|------|----------|
| 개인정보보호법 | 위치정보 수집 사전 동의 | 회원가입 시 위치수집 동의 화면 (필수) |
| 위치정보법 | 수집 목적·보존기간 명시 | 개인정보처리방침 페이지 필수 |
| 위치정보법 | 위치정보사업자 신고 | 방통위 신고 여부 법무 검토 필요 |
| 근로기준법 | 근로자 동의 | 앱 가입 시 위치추적 동의 별도 수집 |

### 7.2 앱스토어 심사 대응

| 플랫폼 | 요건 | 대응 방법 |
|--------|------|----------|
| Google Play | 위치 권한 목적 명시 | 앱 설명 및 개인정보처리방침 URL 등록 |
| Google Play | Foreground Service 알림 | 백그라운드 추적 시 상단 알림 필수 |
| App Store | NSLocationAlwaysUsageDescription | Info.plist 한국어 목적 문구 기재 |
| App Store | App Privacy 항목 | 위치 데이터 수집 항목 상세 기재 |
| 공통 | 최소 수집 원칙 | 도착 확인 즉시 종료 설계 → 심사 유리 |

**심사 통과 핵심 문구**

> "근무자가 처음 방문하는 근무지에 제시간에 도착할 수 있도록,  
> 출근 2시간 전부터 도착 확인까지만 위치를 수집하며,  
> 도착 즉시 위치 추적을 완전히 종료합니다."

---

## 8. 사용자 동의 및 온보딩 흐름

| 단계 | 화면 | 내용 |
|------|------|------|
| 1 | 회원가입 완료 직후 | 위치정보 수집 동의 (필수) — 목적/수집범위/보존기간 안내 |
| 2 | 첫 근무 배정 수락 시 | 배터리 최적화 예외 설정 안내 (Android 전용) |
| 3 | 첫 위치추적 활성화 시 | OS 위치 권한 요청 팝업 |
| 4 | 출근 완료 화면 | "위치추적이 종료되었습니다" 확인 메시지 |

---

## 9. 개발 우선순위 및 마일스톤

| Phase | 기간 | 범위 |
|-------|------|------|
| Phase 1 | 2주 | Supabase 테이블 생성 + PostGIS 설정 + 기본 위치 수집 (`@capacitor/geolocation`) |
| Phase 2 | 2주 | 로컬 알림 스케줄 + FCM 푸시 연동 + 지오펜싱 도착 판별 |
| Phase 3 | 2주 | 노쇼/지각 사전 판별 로직 (Edge Function + pg_cron) + 관리자 알림 |
| Phase 4 | 2주 | 관리자 대시보드 (Google Maps + 실시간 상태 + 근무지별 탭) |
| Phase 5 | 1주 | Android/iOS 테스트 + 앱스토어 심사 대응 문서 작성 |

---

## 10. 미결 사항 및 확인 필요 항목

| # | 항목 | 담당 | 비고 |
|---|------|------|------|
| 1 | 기존 근무지 테이블명 및 위도/경도 컬럼명 확인 | 개발자 | 연동 쿼리 작성 전 필수 |
| 2 | 기존 회원/채용공고 테이블 구조 확인 | 개발자 | `daily_shifts` 연결 방식 결정 |
| 3 | 노쇼 확정 후 대타 공고 자동 등록 기능 범위 | 기획 | Phase 3 이후 별도 기획 |
| 4 | 지각 예측 안전 마진 수치 결정 (+10분 권장) | 기획 | 현장 운영 경험 기반 조정 필요 |
| 5 | Google Maps API 키 발급 및 월 비용 한도 설정 | 개발자 | 관리자 전용이므로 비용 미미 |
| 6 | 위치정보사업자 신고 필요 여부 법무 검토 | 법무 | 방통위 기준 확인 |
| 7 | 회원 동의 철회 시 위치 데이터 삭제 정책 | 기획/법무 | 개인정보처리방침 연동 |

---

*HumendHR 출근 위치추적 · 노쇼/지각 사전 판별 PRD v1.1*

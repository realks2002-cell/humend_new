# AI 채팅 시스템 PRD

> **Feature**: chat
> **Level**: Dynamic
> **Created**: 2026-04-03
> **Status**: Draft

---

## 1. 배경 및 목적

현재 회원(파견 근로자)과의 소통은 카카오톡을 통해 이루어지고 있다. 이를 자체 채팅 시스템으로 전환하여:

- **AI 챗봇**이 반복 문의(일정, 급여, 지원 현황 등)를 자동 처리
- **관리자**가 복잡한 문의에 직접 개입
- 모든 대화 이력이 시스템에 보관되어 업무 연속성 확보
- 카카오톡 의존도 제거

---

## 2. 사용자 스토리

### 회원 (파견 근로자)

| ID | 스토리 | 우선순위 |
|----|--------|:--------:|
| U-01 | 채팅으로 이번 주 근무 일정을 물어보면 AI가 즉시 답해준다 | P0 |
| U-02 | 이번 달 급여가 얼마인지 물어보면 AI가 계산해서 알려준다 | P0 |
| U-03 | 지원한 공고 결과를 물어보면 AI가 현재 상태를 알려준다 | P0 |
| U-04 | AI가 답하지 못하는 질문은 관리자에게 자동 연결된다 | P0 |
| U-05 | 관리자가 직접 메시지를 보내면 실시간으로 받는다 | P0 |
| U-06 | 새 메시지가 오면 FCM 푸시 알림을 받는다 | P0 |
| U-07 | 새 일자리를 추천받고 바로 지원할 수 있다 | P1 |
| U-08 | 출근 장소와 길찾기 링크를 물어볼 수 있다 | P1 |
| U-09 | 계약서, 급여명세서를 요청하면 링크를 받는다 | P1 |
| U-10 | 과거 대화 이력을 스크롤해서 볼 수 있다 | P0 |

### 관리자

| ID | 스토리 | 우선순위 |
|----|--------|:--------:|
| A-01 | 회원과 1:1 채팅을 할 수 있다 | P0 |
| A-02 | AI가 에스컬레이션한 대화를 인수받아 응답한다 | P0 |
| A-03 | 채팅 목록에서 읽지 않은 메시지를 확인한다 | P0 |
| A-04 | 오늘 출근 현황, 미출근자를 물어보면 AI가 집계한다 | P1 |
| A-05 | 특정 회원의 근무/급여 현황을 물어보면 AI가 조회한다 | P1 |
| A-06 | 전체 또는 특정 그룹에게 공지를 보낸다 | P1 |
| A-07 | AI 챗봇의 자동 응답 통계를 확인한다 | P2 |

---

## 3. 단계별 범위

### 1단계: 실시간 채팅 (P0)

카톡을 대체할 기본 1:1 채팅 기능.

**포함:**
- 채팅방 생성/목록/상세
- 실시간 메시지 송수신 (Supabase Realtime)
- 메시지 읽음 표시
- 새 메시지 FCM 푸시 알림
- 회원 앱 채팅 UI (BottomNav 탭 추가)
- 관리자 웹 채팅 UI (사이드바 메뉴 추가)
- 대화 이력 무한 스크롤

**제외 (2단계로):**
- AI 챗봇 자동 응답
- 파일/이미지 전송
- 단체 공지

### 2단계: AI 챗봇 (P0~P1)

AI가 회원 질문에 자동 응답하고, 못 답하면 관리자에게 넘긴다.

**포함:**
- AI SDK + AI Gateway 연동
- DB 조회 도구 (Tool Calling)
  - `getSchedule` — 근무 일정 조회 (daily_shifts, job_postings, applications)
  - `getSalary` — 급여 조회/계산 (work_records, payments)
  - `getApplicationStatus` — 지원 현황 (applications)
  - `getWorkplaceInfo` — 근무지 정보 (clients, client_photos)
  - `getAttendanceStatus` — 출근 확인 상태 (daily_shifts)
  - `searchJobs` — 일자리 검색 (job_postings)
  - `applyToJob` — 채팅에서 바로 지원 (applications INSERT)
- 에스컬레이션 → 관리자 전달 (FCM 알림)
- 대화 맥락 유지 (최근 N개 메시지 컨텍스트)
- AI/관리자 메시지 구분 표시
- 관리자용 AI 도구
  - `getAttendanceSummary` — 오늘 출근 현황 집계
  - `getMemberInfo` — 특정 회원 종합 조회
  - `getStaffingStatus` — 고객사별 배정 현황

---

## 4. 기술 아키텍처

### 4-1. 메시지 흐름

```
[회원 앱]
    ↓ 메시지 전송
[Supabase DB] ← INSERT messages
    ↓ Realtime broadcast
[AI 처리 서버] ← /api/chat/message
    ├─ AI 응답 가능 → AI가 자동 응답 (messages INSERT)
    └─ AI 응답 불가 → 에스컬레이션 (관리자 FCM 알림)
    ↓ Realtime broadcast
[회원 앱] ← 실시간 수신
[관리자 웹] ← 실시간 수신
```

### 4-2. DB 테이블

```sql
-- 채팅방
chat_rooms (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',           -- active, archived
  mode TEXT DEFAULT 'ai',                 -- ai, admin (현재 응답 주체)
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_member INT DEFAULT 0,      -- 회원 미읽음
  unread_count_admin INT DEFAULT 0,       -- 관리자 미읽음
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- 메시지
chat_messages (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,              -- member, ai, admin
  sender_id UUID,                         -- member_id 또는 admin_id
  content TEXT NOT NULL,
  metadata JSONB,                         -- AI tool 결과, 첨부 등
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- AI 컨텍스트 (대화 맥락 요약)
chat_ai_contexts (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  summary TEXT,                           -- AI가 생성한 대화 요약
  tool_history JSONB,                     -- 최근 사용한 도구 이력
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

### 4-3. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 실시간 통신 | Supabase Realtime (Postgres Changes) | 이미 사용 중 |
| AI 모델 | AI SDK + AI Gateway | `anthropic/claude-sonnet-4.6` |
| AI 도구 | AI SDK Tool Calling | DB 조회 함수 연결 |
| 푸시 알림 | 기존 FCM 시스템 | device_tokens 활용 |
| 회원 UI | Capacitor 앱 (채팅 탭) | app-native/ |
| 관리자 UI | Next.js 웹 (채팅 페이지) | app/admin/chat/ |

### 4-4. API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 사용처 |
|-----------|--------|------|--------|
| `/api/chat/message` | POST | 메시지 전송 + AI 처리 | 앱/웹 공통 |
| `/api/chat/rooms` | GET | 채팅방 목록 | 관리자 웹 |
| `/api/chat/rooms/[id]` | GET | 채팅방 상세 + 메시지 | 관리자 웹 |
| `/api/chat/rooms/[id]/read` | POST | 읽음 처리 | 앱/웹 공통 |
| `/api/chat/escalate` | POST | 관리자 전환 | AI → 관리자 |
| `/api/native/chat/rooms` | GET | 회원 채팅방 조회 | 앱 전용 |
| `/api/native/chat/messages` | GET | 메시지 히스토리 | 앱 전용 |
| `/api/native/chat/send` | POST | 회원 메시지 전송 | 앱 전용 |

---

## 5. AI 챗봇 상세

### 5-1. 시스템 프롬프트 (개요)

```
당신은 Humend HR 파견 근로자 도우미입니다.
- 근무 일정, 급여, 지원 현황 등을 안내합니다.
- 도구(Tool)를 사용하여 정확한 데이터를 조회합니다.
- 확실하지 않은 정보는 추측하지 않습니다.
- 처리할 수 없는 요청은 관리자에게 연결합니다.
- 항상 존댓말, 친근한 톤으로 응답합니다.
```

### 5-2. AI 도구 (Tool Calling) 목록

| 도구명 | 입력 | 조회 테이블 | 출력 |
|--------|------|------------|------|
| `getSchedule` | member_id, date_range | daily_shifts + clients | 일정 목록 (날짜, 장소, 시간) |
| `getSalary` | member_id, month | work_records + payments | 급여 상세 (일별, 합계) |
| `getApplicationStatus` | member_id | applications + job_postings | 지원 목록 + 상태 |
| `getWorkplaceInfo` | client_id 또는 shift_id | clients + client_photos | 주소, 사진, 연락처, 지도 링크 |
| `getAttendanceStatus` | member_id, date | daily_shifts | 출근 상태 (confirmed/arrived 등) |
| `searchJobs` | 지역, 날짜, 시급 조건 | job_postings | 매칭 공고 목록 |
| `applyToJob` | member_id, posting_id, work_date | applications | 지원 결과 |
| `escalateToAdmin` | reason | - | 관리자 전환 + FCM 알림 |

### 5-3. 에스컬레이션 조건

AI가 자동으로 관리자에게 넘기는 경우:
- 급여 이의제기, 정산 오류 주장
- 계약 관련 법적 질문
- 불만/컴플레인 감지
- AI가 3회 연속 적절한 도구를 찾지 못한 경우
- 회원이 직접 "관리자 연결" 요청

---

## 6. UI 설계

### 6-1. 회원 앱 (Capacitor)

- **BottomNav**: 기존 탭에 "채팅" 아이콘 추가 (MessageCircle)
- **채팅 화면**: 
  - 상단: "Humend HR 도우미" 타이틀
  - 메시지 버블: AI(왼쪽, 아이콘 구분) / 관리자(왼쪽, 다른 아이콘) / 내 메시지(오른쪽)
  - 하단: 텍스트 입력 + 전송 버튼
  - AI 응답 중 로딩 인디케이터 (타이핑 애니메이션)

### 6-2. 관리자 웹

- **사이드바**: "채팅" 메뉴 추가 (미읽음 배지)
- **채팅 목록**: 회원별 채팅방 리스트 (최근 메시지, 시간, 미읽음 수)
- **채팅 상세**: 
  - 좌측: 채팅방 목록
  - 우측: 선택된 채팅방 메시지
  - AI/관리자 모드 전환 버튼
  - 회원 정보 사이드 패널 (근무현황, 급여 등 퀵뷰)

---

## 7. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 실시간성 | 메시지 전송 후 1초 이내 상대방 수신 |
| AI 응답 속도 | 3초 이내 (스트리밍으로 체감 속도 향상) |
| 메시지 보관 | 최소 1년 |
| 동시 접속 | Supabase Realtime 기본 플랜 범위 내 |
| 보안 | RLS 적용, 본인 채팅방만 접근 |

---

## 8. 구현 순서

### 1단계 (3~5일)

```
Day 1: DB 마이그레이션 + RLS + 기본 API
Day 2: 관리자 웹 채팅 UI (목록 + 상세)
Day 3: 회원 앱 채팅 UI (app-native/)
Day 4: Supabase Realtime 연동 + FCM 알림
Day 5: 테스트 + 버그 수정
```

### 2단계 (5~7일)

```
Day 1-2: AI SDK + AI Gateway 설정 + 시스템 프롬프트
Day 3-4: AI 도구 구현 (getSchedule, getSalary, getApplicationStatus 등)
Day 5: 에스컬레이션 로직 + 관리자 전환
Day 6: AI 응답 스트리밍 + UI 표시
Day 7: 통합 테스트 + 엣지 케이스
```

---

## 9. 성공 지표

| 지표 | 목표 |
|------|------|
| AI 자동 응답률 | 70% 이상의 문의를 AI가 처리 |
| 관리자 응답 시간 | 에스컬레이션 후 평균 5분 이내 |
| 카톡 사용량 | 도입 1개월 후 50% 감소 |
| 회원 만족도 | 채팅 기능 만족도 4.0/5.0 이상 |

---

## 10. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| AI 부정확한 급여 정보 | 높음 | 급여 관련은 항상 "참고용" 안내 + 이의시 관리자 연결 |
| AI Gateway 비용 | 중간 | 토큰 사용량 모니터링 + 응답 길이 제한 |
| Supabase Realtime 제한 | 낮음 | 현재 사용량 대비 충분 (200 동시연결) |
| 앱 APK 재빌드 필요 | 중간 | 1단계 완료 후 APK 빌드, 2단계는 서버만 수정 |

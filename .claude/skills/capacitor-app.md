---
name: Capacitor 하이브리드 앱 개발 규칙
description: Capacitor 앱 빌드, CSS/WebView 호환성, FCM, 인증, 네이티브 플러그인, 디버깅 관련 규칙. "앱", "iOS", "Android", "Capacitor", "네이티브", "에뮬레이터", "플러그인", "빌드", "스크롤", "권한" 언급 시 참조.
---

# Capacitor 하이브리드 앱 개발 규칙

## 핵심 원칙

1. **웹 우선, 앱은 나중** — 웹에서 먼저 완성 후 네이티브 분기
2. **항상 try-catch** — 네이티브 API는 반드시 에러 처리
3. **빌드 순서 엄수** — sync 없이 코드만 수정하면 옛날 코드 실행됨
4. **플랫폼 분기 필수** — `isNative()` 체크 없이 네이티브 API 직접 호출 금지

## 빌드 프로세스

### 빌드 순서 (반드시 준수)
```
npm run build:capacitor  →  Android Studio Build APK  →  설치/테스트
```
- `build:capacitor`는 `app-native/`를 `app/`에 overlay → 정적 빌드 → cap sync → 소스 복원
- **cap sync는 소스 복원 전에 실행**해야 함 (server.url 제거된 상태에서)
- `capacitor.config.ts`의 `server.url`은 빌드 스크립트가 sed로 제거 — 수동으로 주석 처리하지 말 것

### 코드 변경 후 반영 범위
| 변경 대상 | Vercel 배포만으로 충분? | APK 재빌드 필요? |
|-----------|:---:|:---:|
| Server Action, API route | O | X |
| 미들웨어 (middleware.ts) | O | X |
| `src/app-native/` 페이지/컴포넌트 | X | O |
| `src/app-native/globals.css` | X | O |
| `src/lib/native-api/` | X | O |
| `src/lib/capacitor/` | X | O |
| `src/hooks/usePushNotifications.ts` | X | O |
| `src/components/layout/BottomNav.tsx` | X | O |

### 캐시 클리어 (문제 해결 시)
```bash
rm -rf .next out node_modules/.cache
npm run build:capacitor
```

## 플랫폼 분기 패턴

```typescript
// ✅ 올바른 패턴: 동적 import + 플랫폼 체크
import { isNative } from "@/lib/capacitor/native";

async function doSomething() {
  if (isNative()) {
    const { Camera } = await import("@capacitor/camera");
    return Camera.getPhoto({...});
  } else {
    // 웹 폴백
  }
}

// ❌ 절대 금지: 직접 import (웹 빌드에서 모듈 없음 에러)
import { Camera } from '@capacitor/camera';
```

## CSS 규칙 (Android WebView 호환)

### 절대 하지 말 것
```css
/* ❌ * 선택자에 touch/select 관련 속성 — 스크롤 완전 파괴 */
* { user-select: none; }
* { -webkit-touch-callout: none; }

/* ❌ 스크롤바 숨기기 — Android WebView에서 스크롤 기능 자체를 비활성화 */
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }

/* ❌ textarea에 height 강제 — 여러 줄 입력 불가 */
input, select, textarea { height: 2rem !important; }

/* ❌ overscroll-behavior: none — Y축 스크롤까지 차단 */
html, body { overscroll-behavior: none; }

/* ❌ overflow: hidden을 html/body에 — 전체 스크롤 차단 */
html, body { overflow: hidden; }
```

### 올바른 패턴
```css
/* ✅ body에만 적용 — * 선택자 사용 금지 */
body {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
}

/* ✅ 입력 요소는 선택 허용 */
input, textarea, [contenteditable] {
  -webkit-user-select: text;
  user-select: text;
}

/* ✅ X축만 제한, Y축은 건드리지 않음 */
html, body {
  overscroll-behavior-x: none;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch;
}

/* ✅ textarea는 height 강제하지 않음 */
input, select { height: 2rem !important; }
textarea { font-size: 13px !important; }
```

### CSS 변수 주의
- Android WebView에서 `text-muted-foreground` 등 CSS 변수가 네이티브 input에 적용 안 될 수 있음
- `opacity` 또는 인라인 `style`로 대체

## 인증 (Auth)

### 토큰 저장소
- **Supabase 세션** (`localStorage`) — 유일한 인증 저장소
- **Capacitor Preferences** — 사용하지 않음 (저장 코드 없음)
- 토큰이 필요할 때는 항상 `supabase.auth.getSession()`으로 획득

```typescript
// ✅ 올바른 방법
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// ❌ 절대 사용하지 말 것 — 저장 코드가 없어서 항상 null
const { Preferences } = await import("@capacitor/preferences");
const { value } = await Preferences.get({ key: "access_token" });
```

### 고아 유저 방지
- 구글 로그인 시 `auth.users`에 유저 생성 → `members` 테이블 등록 실패 가능
- `auth-guard.tsx`에서 members 체크 → 없으면 `/signup/complete`로 리다이렉트
- `middleware.ts`에서도 동일한 체크 (웹용)

### 구글 로그인 흐름
```
앱: nativeGoogleSignIn() → signInWithIdToken → auth.users 생성 → members 체크
  → 있으면: /my로 이동
  → 없으면: /signup/complete → createGoogleMember API → members 등록
```

## FCM 푸시 알림

### 토큰 등록 타이밍
- `usePushNotifications` 훅 — 앱 실행 시 자동 (NativeAppProvider → useEffect)
- 토큰 전송은 **fire-and-forget** (페이지 전환으로 취소되지 않도록)
- 서버 API (`/api/native/push/register`)는 기존 토큰 삭제 후 새 토큰 INSERT

### 알림 채널 (Android 8+ 필수)
- `registerPush()`에서 `PushNotifications.createChannel({ id: "default" })` 호출
- 서버 FCM 발송 시 `channel_id: "default"` — 반드시 일치
- 채널 없으면 Android가 알림을 무시함

### 토큰 무효화
- 앱 재설치 시 기존 토큰 UNREGISTERED
- 재로그인하면 새 토큰 자동 등록 (기존 토큰은 DELETE 후 INSERT)

## 네이티브 기능 추가 체크리스트

### Phase 1: 웹에서 먼저 완성
- [ ] `npm run dev`로 localhost에서 기능 구현
- [ ] 웹 브라우저에서 동작 확인
- [ ] 에러 처리 완료

### Phase 2: 플러그인 설치
- [ ] `npm install @capacitor/[plugin-name]`
- [ ] `npx cap sync` 실행

### Phase 3: 네이티브 설정
**iOS** (`ios/App/App/Info.plist`):
```xml
<key>NSCameraUsageDescription</key>
<string>프로필 사진 촬영을 위해 카메라 접근이 필요합니다</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>출퇴근 기록을 위해 현재 위치가 필요합니다</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>사진을 선택하기 위해 갤러리 접근이 필요합니다</string>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Phase 4: 플랫폼 분기 코드
- [ ] `isNative()` 체크 + 동적 import
- [ ] 웹 폴백 구현
- [ ] 권한 체크 코드 포함

### Phase 5: 양쪽 테스트
- [ ] Android 실기기/에뮬레이터 테스트
- [ ] 권한 거부 시나리오 테스트
- [ ] 기존 기능 회귀 테스트

## 권한 처리 패턴

```typescript
// ✅ 항상 권한 체크 → 요청 → 사용
async function useNativeFeature() {
  try {
    const permission = await Plugin.checkPermissions();
    if (permission.xxx !== 'granted') {
      const result = await Plugin.requestPermissions();
      if (result.xxx !== 'granted') {
        throw new Error('권한이 거부되었습니다');
      }
    }
    // 기능 사용
  } catch (error) {
    console.error('에러:', error);
    // 사용자에게 안내
  }
}

// ❌ 권한 체크 없이 바로 사용 — 크래시
const photo = await Camera.getPhoto({...});
```

## Dialog / Modal 규칙

### Radix Dialog body lock 주의
```typescript
// ❌ body에 overflow: hidden이 영구 잠금됨 — 스크롤 파괴
<Dialog open={show} onOpenChange={() => {}}>

// ✅ 닫기 가능하도록 상태 연결
<Dialog open={show} onOpenChange={setShow}>
```

## 레이아웃 구조

```
layout.tsx
  └ <body>
      └ NativeAppProvider (usePushNotifications, useAttendance)
          └ TermsAgreement (첫 실행 시 약관 동의)
              └ <main className="min-h-screen pb-16">
                  └ {children} (각 페이지)
              └ <BottomNav />
```

- `paddingTop: env(safe-area-inset-top)` — layout.tsx의 main에만 적용
- 홈 페이지(page.tsx)에 자체 header가 있으면 safe-area 이중 적용 주의
- BottomNav 높이: `pb-16` (64px) + `env(safe-area-inset-bottom)`

## 디버깅

### Android
```bash
# Chrome DevTools로 WebView 디버깅
# 1. 기기 USB 연결 + USB 디버깅 활성화
# 2. Chrome에서 chrome://inspect 접속
# 3. 기기 선택 > inspect
```

### 자주 보는 에러
| 에러 | 원인 | 해결 |
|------|------|------|
| `plugin not implemented` | `npx cap sync` 안 함 | `npm run build:capacitor` 재실행 |
| `Cleartext HTTP traffic not permitted` | `network_security_config.xml` 누락 | 파일 생성 또는 빌드 스크립트 복원 확인 |
| `UNREGISTERED` (FCM) | 앱 재설치로 토큰 무효화 | 재로그인으로 새 토큰 등록 |
| 스크롤 안 됨 | CSS `*` 선택자에 touch 속성 | body에만 적용으로 변경 |
| 로그인 후 빈 화면 | 고아 유저 (auth만 있고 members 없음) | auth-guard에서 members 체크 |

### 코드 수정 후 테스트 순서
1. `npx tsc --noEmit` — 타입 체크
2. `npm run build:capacitor` — 앱 빌드
3. Android Studio **Build APK** 또는 **▶️ Run**
4. 에뮬레이터/실기기에서 확인

## 위치정보

- 보관 기간: **90일** (모든 고지에서 통일 — signup, location-consent, privacy 모두)
- 수집 시점: 배정된 근무일 출근 2시간 전 ~ 도착 확인
- 도착 판별: 30m (서버 Haversine 계산)
- 근접 기록: 2km (1회)

## 자주 하는 실수

```typescript
// ❌ 실수 1: sync 없이 코드 수정 후 바로 실행
// → 옛날 코드가 실행됨
// ✅ 항상: npm run build:capacitor → Android Studio Build

// ❌ 실수 2: 웹 전용 코드를 앱에서 그대로 사용
fetch('/api/something')  // 앱에서는 상대 경로 안 됨
// ✅ API_BASE 사용
fetch(`${API_BASE}/api/something`)

// ❌ 실수 3: Server Action을 앱에서 호출
// → 앱은 정적 빌드(output: export)라 Server Action 불가
// ✅ API route + fetch로 대체 (src/lib/native-api/actions.ts)

// ❌ 실수 4: Capacitor 모듈 직접 import
import { Camera } from '@capacitor/camera';  // 웹 빌드에서 에러
// ✅ 동적 import
const { Camera } = await import('@capacitor/camera');
```

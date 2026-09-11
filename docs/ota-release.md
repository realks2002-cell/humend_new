# OTA 배포 가이드 (Capgo 셀프호스팅)

앱의 웹 번들(`out/`)을 스토어 심사 없이 교체한다. 네이티브 플러그인 `@capgo/capacitor-updater`가 앱 실행·포그라운드 복귀 때 `https://humendhr.com/api/app-update`에 업데이트를 묻고, 서버는 Vercel Blob의 `ota/manifest.json`을 보고 응답한다.

| 구성 | 위치 |
|---|---|
| 업데이트 API | `src/app/api/app-update/route.ts` (판정: `src/lib/ota/decide.ts`) |
| 부팅 성공 신호 | `src/components/layout/OtaReady.tsx` → `src/app-native/layout.tsx` |
| 업로드 스크립트 | `scripts/upload-ota.mjs` |
| 매니페스트 / 번들 | Blob `ota/manifest.json`, `ota/bundles/<version>.zip` |

## 1. 최초 1회 — 플러그인 포함 빌드 스토어 제출

1. 네이티브 버전 올리기: Android `versionCode 7`, iOS `CFBundleVersion 23` (예정)
2. 변경사항 **전부 커밋** 후 `npm run build:capacitor` (android/ios/all) — 스크립트가 `git checkout`으로 소스를 되돌리므로 미커밋 변경은 사라진다
3. Android Studio / Xcode에서 빌드해 스토어 제출
4. 이 빌드의 versionCode가 이후 OTA의 `minVersionCode`가 된다 (그보다 낮은 설치본엔 플러그인이 없어 요청 자체를 안 한다)

## 2. OTA 배포

```bash
# 1) 커밋 후 정적 빌드
npm run build:capacitor

# 2) 업로드 (플랫폼별 minVersionCode가 다르면 android=..,ios=.. 형식)
node scripts/upload-ota.mjs --platform all --min-version-code android=7,ios=23
node scripts/upload-ota.mjs --platform android --min-version-code 7 --version 2026.09.11-1530
node scripts/upload-ota.mjs --platform android --min-version-code 7 --max-version-code 7   # 7 설치본에만
```

- 번들 이름 기본값: `YYYY.MM.DD-HHmm`. 같은 이름은 재업로드 불가(덮어쓰기 금지 — 캐시된 옛 zip과 체크섬 불일치 방지)
- `--min-version-code` 생략 시 매니페스트의 기존 값을 그대로 쓴다. `--platform all`이면 `android=N,ios=M` 형식만 허용
- `--max-version-code`(매니페스트 `maxVersionCode`, 선택): 이 값보다 큰 versionCode 설치본은 받지 않는다. 생략하면 상한 없음(기존 값 유지 안 함)
- 업로드 후 스크립트가 운영 `/api/app-update`에 테스트 요청을 보내 반영 여부를 출력한다 (캐시로 최대 1분 지연 가능)
- 기기는 다음 실행/포그라운드 복귀 때 받아서 백그라운드 전환 시 적용한다. 서버 캐시 때문에 반영까지 최대 약 1분
- 새 번들이 뜬 뒤 10초 안에 `notifyAppReady()`가 호출되지 않으면(부팅 크래시 등) 기기가 자동으로 이전 번들로 되돌린다

## 3. 롤백

```bash
node scripts/upload-ota.mjs --rollback android   # android | ios | all
```

해당 플랫폼 기기가 스토어 내장 번들로 돌아간다. 다시 배포하려면 수정 후 2번을 실행하면 롤백 플래그가 해제된다. 매니페스트 항목에 `"disabled": true`를 넣으면 롤백 없이 신규 배포만 멈춘다.

## 4. 주의사항

- **네이티브 변경은 OTA 불가** — 플러그인 추가/업데이트, 권한, `capacitor.config.ts`, `android/`·`ios/` 변경은 스토어 제출 필요. 그 빌드의 versionCode로 `--min-version-code`를 올려 옛 설치본에 새 번들이 가지 않게 한다
- **스토어 새 빌드 출시 순서** — 안 지키면 새 설치본(내장 번들이 더 최신)이 매니페스트의 옛 OTA 번들로 내려간다
  1. 새 빌드의 versionCode를 올리고 커밋 → `npm run build:capacitor`
  2. **스토어 제출 전에** 같은 `out/`으로 OTA를 먼저 올린다: `--min-version-code <새 versionCode>`
  3. 스토어 제출
  - 옛 설치본에 계속 OTA를 보내야 하면(새 빌드 심사 중 핫픽스 등) 그 OTA는 `--max-version-code <이전 versionCode>`로 올려 새 빌드가 받지 않게 한다
- `build-capacitor.sh`는 반드시 **커밋 후** 실행 (미커밋 변경 소실). 업로드 스크립트는 작업트리가 더러우면 경고만 한다
- 번들은 앱 전용 API(`/api/native/*`)를 호출하므로, 번들이 새 API에 의존하면 **Vercel 배포를 먼저** 끝낸 뒤 OTA 업로드
- Vercel Ignored Build Step 제외 경로에 `':!scripts/upload-ota.mjs'` 추가 권장 (스크립트만 바뀐 커밋으로 재빌드 방지)
- `server.url`이 있는 개발 빌드(에뮬레이터)에서는 플러그인이 자동 업데이트를 끈다 — OTA 테스트는 `build:capacitor`로 만든 빌드로
- 서버는 오류가 나도 항상 200 `up_to_date`로 응답한다 (429 등은 플러그인이 최대 24시간 요청을 차단)

/**
 * 백그라운드 위치추적 — @capacitor-community/background-geolocation
 * distanceFilter 이벤트 중심 + 배터리 최적화
 * - 30초 폴링 제거 → 5분 keep-alive
 * - accuracy 필터링 (GPS 튐 방지)
 * - 속도 기반 distanceFilter 동적 조정
 * - 배터리 저전력 대응 (Android Web Battery API)
 */
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native";
import { getPlatform } from "./native";
import { calcDistanceMeters } from "./geolocation";

// ─── 플러그인 인터페이스 ───

interface BGLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  bearing: number | null;
  speed: number | null;
  time: number;
  simulated: boolean;
}

interface BGError {
  code: string;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: WatcherOptions,
    callback: (location: BGLocation | null, error: BGError | null) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

interface WatcherOptions {
  backgroundMessage: string;
  backgroundTitle: string;
  requestPermissions: boolean;
  stale: boolean;
  distanceFilter: number;
}

let BackgroundGeolocation: BackgroundGeolocationPlugin | null = null;

function getPlugin(): BackgroundGeolocationPlugin {
  if (!BackgroundGeolocation) {
    BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
      "BackgroundGeolocation"
    );
  }
  return BackgroundGeolocation;
}

// ─── 상수 ───

// 속도 임계값 (m/s)
const SPEED_WALK = 1.67;    // 6 km/h
const SPEED_BICYCLE = 6.94; // 25 km/h

// distanceFilter (미터)
const DF_WALK = 500;
const DF_BICYCLE = 700;
const DF_VEHICLE = 1000;
const DF_LOW_BATTERY = 1000;
const DF_INITIAL = 500;

// accuracy 필터링 (미터)
const MAX_ACCURACY = 50;
const MAX_ACCURACY_SLC = 200;

// 타이머
const KEEPALIVE_MS = 5 * 60 * 1000;      // 5분
const DF_CHANGE_COOLDOWN_MS = 60_000;     // 1분
const DEBOUNCE_MS = 20_000;               // 20초 중복 방지
const POST_ARRIVAL_INTERVAL_MS = 15 * 60 * 1000; // 15분

// ─── 모듈 상태 ───

let watcherId: string | null = null;
let lastSentAt = 0;
let isStarting = false;
let keepAliveTimer: ReturnType<typeof setTimeout> | null = null;
let postArrivalInterval: ReturnType<typeof setInterval> | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

// 위치 / DF 상태
let prevLocation: { lat: number; lng: number; time: number } | null = null;
let currentDistanceFilter = DF_INITIAL;
let lastDFChangeAt = 0;

// 배터리 / SLC 상태 / DF 업데이트 잠금
let isLowPowerMode = false;
let isUpdatingDF = false;
let isSLCRecoveryMode = false;
let batteryCleanup: (() => void) | null = null;

// 현재 watcher 콜백/옵션 보관 (DF 변경 시 재등록용)
let currentWatcherCallback: ((location: BGLocation | null, error: BGError | null) => void) | null = null;

export interface TrackingCallbacks {
  onLocation: (lat: number, lng: number, speed: number | null, accuracy: number | null) => void;
  onArrival: () => void;
  onError?: (error: unknown) => void;
}

// ─── 유틸 함수 ───

/** accuracy 기반 위치 수용 여부 */
function shouldAcceptLocation(accuracy: number): boolean {
  if (isSLCRecoveryMode) {
    return accuracy <= MAX_ACCURACY_SLC;
  }
  return accuracy <= MAX_ACCURACY;
}

/** SLC 모드 판별 (iOS에서 앱 kill 후 SLC 복구 시 accuracy 저하) */
function updateSLCMode(accuracy: number): void {
  if (getPlatform() !== "ios") return;

  if (!isSLCRecoveryMode && accuracy > MAX_ACCURACY && accuracy <= MAX_ACCURACY_SLC) {
    isSLCRecoveryMode = true;
  } else if (isSLCRecoveryMode && accuracy <= MAX_ACCURACY) {
    isSLCRecoveryMode = false;
  }
}

/** 두 좌표 + 시간차로 속도 계산 (m/s), 플러그인 speed 우선 */
function computeSpeed(
  cur: { lat: number; lng: number; time: number },
  pluginSpeed: number | null
): number {
  if (pluginSpeed !== null && pluginSpeed >= 0) {
    return pluginSpeed;
  }
  if (!prevLocation) return 0;

  const dt = (cur.time - prevLocation.time) / 1000;
  if (dt <= 0) return 0;

  const dist = calcDistanceMeters(prevLocation.lat, prevLocation.lng, cur.lat, cur.lng);
  return dist / dt;
}

/** 속도 → distanceFilter 매핑 */
function classifySpeed(speed: number): number {
  if (isLowPowerMode) return DF_LOW_BATTERY;
  if (speed <= SPEED_WALK) return DF_WALK;
  if (speed <= SPEED_BICYCLE) return DF_BICYCLE;
  return DF_VEHICLE;
}

// ─── Watcher 관리 ───

/** watcher 생성 (분리된 함수로 DF 변경 시 재사용) */
async function createWatcher(
  distanceFilter: number,
  callback: (location: BGLocation | null, error: BGError | null) => void
): Promise<string> {
  const plugin = getPlugin();
  return plugin.addWatcher(
    {
      backgroundMessage: "출근 위치를 확인하고 있습니다.",
      backgroundTitle: "Humend HR 출근 추적",
      requestPermissions: true,
      stale: false,
      distanceFilter,
    },
    callback
  );
}

/** distanceFilter 변경이 필요하면 watcher 재등록 */
async function maybeUpdateDistanceFilter(newDF: number): Promise<void> {
  if (newDF === currentDistanceFilter) return;
  if (!watcherId || !currentWatcherCallback) return;
  if (isUpdatingDF) return;

  const now = Date.now();
  if (now - lastDFChangeAt < DF_CHANGE_COOLDOWN_MS) return;

  isUpdatingDF = true;
  try {
    const plugin = getPlugin();
    const oldId = watcherId;
    watcherId = null;
    await plugin.removeWatcher({ id: oldId });
    watcherId = await createWatcher(newDF, currentWatcherCallback);
    currentDistanceFilter = newDF;
    lastDFChangeAt = now;
  } catch {
    // 재등록 실패 — watcherId가 null이면 watcher 유실
    // 기존 DF로 재등록 시도
    if (!watcherId && currentWatcherCallback) {
      try {
        watcherId = await createWatcher(currentDistanceFilter, currentWatcherCallback);
      } catch {
        // 복구도 실패 시 추적 중단 상태
      }
    }
  } finally {
    isUpdatingDF = false;
  }
}

// ─── Keep-alive 타이머 ───

let lastKnownLocation: { lat: number; lng: number; speed: number | null; accuracy: number | null } | null = null;

/** 5분 keep-alive: 마지막 이벤트 후 5분간 새 이벤트 없으면 마지막 좌표 재전송 */
function resetKeepAlive(callbacks: TrackingCallbacks): void {
  if (keepAliveTimer) {
    clearTimeout(keepAliveTimer);
  }
  keepAliveTimer = setTimeout(() => {
    if (!watcherId) return; // 추적 중지 후 실행 방지
    if (lastKnownLocation) {
      callbacks.onLocation(
        lastKnownLocation.lat,
        lastKnownLocation.lng,
        lastKnownLocation.speed,
        lastKnownLocation.accuracy
      );
      lastSentAt = Date.now();
    }
    resetKeepAlive(callbacks);
  }, KEEPALIVE_MS);
}

// ─── 배터리 모니터링 ───

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

/** Android Web Battery API로 저전력 감지 */
async function initBatteryMonitoring(): Promise<void> {
  if (getPlatform() !== "android") return;

  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;

    const battery = await nav.getBattery();

    function checkBattery() {
      const wasLowPower = isLowPowerMode;
      isLowPowerMode = battery.level <= 0.15 && !battery.charging;

      if (isLowPowerMode && !wasLowPower) {
        maybeUpdateDistanceFilter(DF_LOW_BATTERY);
      } else if (!isLowPowerMode && wasLowPower) {
        // 배터리 회복 시 현재 속도 기반 DF로 복원
        const speed = prevLocation ? computeSpeed(prevLocation, null) : 0;
        maybeUpdateDistanceFilter(classifySpeed(speed));
      }
    }

    checkBattery();

    const onLevelChange = () => checkBattery();
    const onChargingChange = () => checkBattery();

    battery.addEventListener("levelchange", onLevelChange);
    battery.addEventListener("chargingchange", onChargingChange);

    batteryCleanup = () => {
      battery.removeEventListener("levelchange", onLevelChange);
      battery.removeEventListener("chargingchange", onChargingChange);
    };
  } catch {
    // Web Battery API 미지원 시 무시
  }
}

// ─── 메인 추적 ───

/**
 * 백그라운드 위치추적 시작
 * @param targetLat 목적지 위도
 * @param targetLng 목적지 경도
 * @param callbacks 위치/도착/에러 콜백
 * @param geofenceRadius 도착 판정 반경 (기본 200m)
 * @param endTime 퇴근 시간 (HH:MM 또는 HH:MM:SS), 이 시간 + 30분 후 자동 종료
 * @param workDate 근무 날짜 (YYYY-MM-DD)
 */
export async function startTracking(
  targetLat: number,
  targetLng: number,
  callbacks: TrackingCallbacks,
  geofenceRadius = 200,
  endTime?: string,
  workDate?: string,
): Promise<boolean> {
  if (!isNative()) return false;
  if (watcherId) return true;
  if (isStarting) return false;
  isStarting = true;

  try {
    clearTimers();
    resetState();

    let arrived = false;

    // 배터리 모니터링 시작
    await initBatteryMonitoring();

    const watcherCallback = (location: BGLocation | null, error: BGError | null) => {
      if (error || !location) return;

      // SLC 모드 판별 (iOS)
      updateSLCMode(location.accuracy);

      // accuracy 필터링
      if (!shouldAcceptLocation(location.accuracy)) return;

      // 디바운스
      const now = Date.now();
      if (now - lastSentAt < DEBOUNCE_MS) return;

      // 속도 계산 + distanceFilter 동적 조정 (GPS 타임스탬프 사용)
      const curLoc = { lat: location.latitude, lng: location.longitude, time: location.time };
      const speed = computeSpeed(curLoc, location.speed);
      const newDF = classifySpeed(speed);
      prevLocation = curLoc;

      // distanceFilter 변경 (비동기, fire-and-forget)
      if (!arrived) {
        maybeUpdateDistanceFilter(newDF);
      }

      // 위치 전송
      lastSentAt = now;
      lastKnownLocation = {
        lat: location.latitude,
        lng: location.longitude,
        speed: location.speed,
        accuracy: location.accuracy,
      };
      callbacks.onLocation(location.latitude, location.longitude, location.speed, location.accuracy);

      // keep-alive 리셋
      resetKeepAlive(callbacks);

      // 도착 판정
      if (!arrived) {
        const dist = calcDistanceMeters(location.latitude, location.longitude, targetLat, targetLng);
        if (dist <= geofenceRadius) {
          arrived = true;
          callbacks.onArrival();
          startPostArrivalTracking(callbacks);
        }
      }
    };

    currentWatcherCallback = watcherCallback;
    watcherId = await createWatcher(DF_INITIAL, watcherCallback);
    currentDistanceFilter = DF_INITIAL;

    // keep-alive 시작
    resetKeepAlive(callbacks);

    // 자동 종료 타이머: endTime + 30분 또는 fallback 2시간
    let autoStopMs = 2 * 60 * 60 * 1000;
    if (endTime && workDate) {
      const endTimeNorm = endTime.length === 5 ? endTime + ":00" : endTime;
      const endDate = new Date(`${workDate}T${endTimeNorm}+09:00`);
      const stopAt = endDate.getTime() + 30 * 60 * 1000;
      const remaining = stopAt - Date.now();
      if (remaining > 0) {
        autoStopMs = remaining;
      }
    }

    autoStopTimer = setTimeout(() => {
      stopTracking();
    }, autoStopMs);

    return true;
  } catch {
    return false;
  } finally {
    isStarting = false;
  }
}

/** 도착 후 15분 간격 위치 전송 + keep-alive 병행 */
function startPostArrivalTracking(callbacks: TrackingCallbacks): void {
  postArrivalInterval = setInterval(async () => {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      const { latitude, longitude, speed, accuracy } = pos.coords;

      lastKnownLocation = { lat: latitude, lng: longitude, speed, accuracy };
      lastSentAt = Date.now();
      callbacks.onLocation(latitude, longitude, speed, accuracy);

      resetKeepAlive(callbacks);
    } catch (err) {
      callbacks.onError?.(err);
    }
  }, POST_ARRIVAL_INTERVAL_MS);
}

// ─── 정리 ───

function clearTimers(): void {
  if (keepAliveTimer) {
    clearTimeout(keepAliveTimer);
    keepAliveTimer = null;
  }
  if (postArrivalInterval) {
    clearInterval(postArrivalInterval);
    postArrivalInterval = null;
  }
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
}

/** 모든 모듈 상태 초기화 */
function resetState(): void {
  prevLocation = null;
  currentDistanceFilter = DF_INITIAL;
  lastDFChangeAt = 0;
  isLowPowerMode = false;
  isUpdatingDF = false;
  isSLCRecoveryMode = false;
  lastKnownLocation = null;
  currentWatcherCallback = null;
  lastSentAt = 0;
}

/** 추적 중지 */
export async function stopTracking(): Promise<void> {
  if (!isNative() || !watcherId) return;

  try {
    const plugin = getPlugin();
    await plugin.removeWatcher({ id: watcherId });
  } catch {
    // ignore
  }

  watcherId = null;
  isStarting = false;

  clearTimers();

  if (batteryCleanup) {
    batteryCleanup();
    batteryCleanup = null;
  }

  resetState();
}

/** 추적 중인지 여부 */
export function isTracking(): boolean {
  return watcherId !== null;
}

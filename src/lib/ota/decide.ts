export const UP_TO_DATE = {
  kind: "up_to_date",
  error: "no_new_version_available",
  message: "No new version available",
} as const;

export type OtaResponse =
  | typeof UP_TO_DATE
  | { version: "builtin" }
  | { version: string; url: string; checksum: string };

export type OtaDecision = { response: OtaResponse; problem?: string };

const CHECKSUM_RE = /^[0-9a-f]{64}$/i;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

export function decideUpdate(body: unknown, manifest: unknown): OtaDecision {
  if (!isRecord(body)) return { response: UP_TO_DATE };

  const platform = body.platform;
  const versionName = asString(body.version_name);
  const versionBuild = asString(body.version_build);
  const versionCode = parseInt(asString(body.version_code) ?? "", 10);
  if ((platform !== "android" && platform !== "ios") || !versionName || Number.isNaN(versionCode)) {
    return { response: UP_TO_DATE };
  }

  if (!isRecord(manifest)) return { response: UP_TO_DATE };
  const entry = manifest[platform];
  if (!isRecord(entry)) return { response: UP_TO_DATE };

  if (entry.rollback === true) {
    const onBuiltin = versionName === "builtin" || versionName === versionBuild;
    return { response: onBuiltin ? UP_TO_DATE : { version: "builtin" } };
  }
  if (entry.disabled === true) return { response: UP_TO_DATE };

  const { version, url, checksum, minVersionCode, maxVersionCode } = entry;
  if (typeof minVersionCode !== "number" || !Number.isFinite(minVersionCode)) {
    return { response: UP_TO_DATE, problem: `${platform}: invalid minVersionCode` };
  }
  if (versionCode < minVersionCode) return { response: UP_TO_DATE };
  if (maxVersionCode !== undefined) {
    if (typeof maxVersionCode !== "number" || !Number.isFinite(maxVersionCode)) {
      return { response: UP_TO_DATE, problem: `${platform}: invalid maxVersionCode` };
    }
    if (versionCode > maxVersionCode) return { response: UP_TO_DATE };
  }

  if (typeof version !== "string" || !version || version === "builtin") {
    return { response: UP_TO_DATE, problem: `${platform}: invalid version` };
  }
  if (versionName === version) return { response: UP_TO_DATE };

  if (typeof url !== "string" || !url.startsWith("https://")) {
    return { response: UP_TO_DATE, problem: `${platform}: invalid url` };
  }
  if (typeof checksum !== "string" || !CHECKSUM_RE.test(checksum)) {
    return { response: UP_TO_DATE, problem: `${platform}: invalid checksum` };
  }

  return { response: { version, url, checksum: checksum.toLowerCase() } };
}

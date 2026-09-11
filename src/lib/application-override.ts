// 관리자가 지원 건별로 수정한 근무지·근무시간(applications.override_*)을 공고 값 위에 덮어씀.
// 조회 결과의 job_postings를 바꿔 두면 지원내역·마이 홈·관리자 표 등 기존 화면이 그대로 수정값을 표시한다.

export const OVERRIDE_CLIENT_SELECT =
  "override_client:clients!override_client_id(company_name, location, hourly_wage, wage_type, daily_wage, monthly_wage)";

type OverrideClient = { company_name: string } & Record<string, unknown>;

interface WithOverride {
  override_client_id?: string | null;
  override_start_time?: string | null;
  override_end_time?: string | null;
  override_client?: OverrideClient | OverrideClient[] | null;
  job_postings?: unknown;
}

export function hasApplicationOverride(app: WithOverride) {
  return !!(app.override_client_id || app.override_start_time || app.override_end_time);
}

export function applyApplicationOverride<T extends WithOverride>(app: T): T {
  const jp = app.job_postings as { start_time?: string; end_time?: string; clients?: Record<string, unknown> } | null | undefined;
  if (!jp || !hasApplicationOverride(app)) return app;
  const client = Array.isArray(app.override_client) ? app.override_client[0] : app.override_client;
  return {
    ...app,
    job_postings: {
      ...jp,
      start_time: app.override_start_time ?? jp.start_time,
      end_time: app.override_end_time ?? jp.end_time,
      clients: client ? { ...jp.clients, ...client } : jp.clients,
    },
  };
}

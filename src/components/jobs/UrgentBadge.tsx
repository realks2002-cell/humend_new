// 급구 공고 표시 (모집중 + is_urgent) — 웹·앱 공고 목록/상세 공통
export function UrgentBadge({ job }: { job: { status: string; is_urgent?: boolean } }) {
  if (!job.is_urgent || job.status !== "open") return null;
  return (
    <span className="inline-block rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-orange-700">
      급구
    </span>
  );
}

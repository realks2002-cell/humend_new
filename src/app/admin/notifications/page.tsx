import { getNotificationLogs, getMembers } from "./actions";
import NotificationForm from "./notification-form";

export default async function NotificationsPage() {
  const [logs, members] = await Promise.all([
    getNotificationLogs(),
    getMembers(),
  ]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-xl font-bold">알림 관리</h1>

      <NotificationForm members={members} />

      {/* 발송 내역 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">발송 내역</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">발송 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">발송일시</th>
                  <th className="px-3 py-2 text-left font-medium">제목</th>
                  <th className="px-3 py-2 text-left font-medium">내용</th>
                  <th className="px-3 py-2 text-center font-medium">대상</th>
                  <th className="px-3 py-2 text-center font-medium">발송수</th>
                  <th className="px-3 py-2 text-center font-medium">유형</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium">{log.title}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                      {log.body}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center">
                      {log.target_type === "all"
                        ? "전체"
                        : log.members?.name ?? log.members?.phone ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-center">{log.sent_count}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.trigger_type === "manual"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {log.trigger_type === "manual" ? "수동" : "자동"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

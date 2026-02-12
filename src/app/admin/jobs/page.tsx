import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllClientsWithJobs, getAllClients } from "@/lib/supabase/queries";
import { formatDate, formatWage } from "@/lib/utils/format";
import { Clock } from "lucide-react";
import { CreateJobButton, AddSlotButton } from "./job-form";
import { DeleteJobButton } from "./delete-job-button";

export default async function AdminJobsPage() {
  const [clientsWithJobs, allClients] = await Promise.all([
    getAllClientsWithJobs(),
    getAllClients(),
  ]);

  const clientOptions = allClients.map((c) => ({
    id: c.id,
    company_name: c.company_name,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">공고 관리</h1>
          <p className="mt-1 text-muted-foreground">
            채용공고를 등록하고 관리합니다.
          </p>
        </div>
        <CreateJobButton clients={clientOptions} />
      </div>

      {clientsWithJobs.length === 0 ? (
        <p className="mt-8 py-16 text-center text-muted-foreground">
          등록된 공고가 없습니다.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {clientsWithJobs.map((client) => (
            <Card key={client.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {client.company_name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      시급 {formatWage(client.hourly_wage)}
                    </span>
                  </CardTitle>
                  <AddSlotButton clientId={client.id} clients={clientOptions} />
                </div>
              </CardHeader>
              <CardContent>
                {client.job_postings.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    등록된 일정이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {client.job_postings.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              job.status === "open"
                                ? "default"
                                : job.status === "closed"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {formatDate(job.work_date)}
                          </Badge>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {job.start_time}~{job.end_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{job.headcount}명</span>
                          <Badge
                            variant={
                              job.status === "open"
                                ? "default"
                                : job.status === "closed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {job.status === "open"
                              ? "모집중"
                              : job.status === "closed"
                                ? "마감"
                                : "종료"}
                          </Badge>
                          <DeleteJobButton postingId={job.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

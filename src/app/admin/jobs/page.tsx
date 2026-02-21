export const dynamic = "force-dynamic";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllClientsWithJobs, getAllClients } from "@/lib/supabase/queries";
import { formatDate, formatWage } from "@/lib/utils/format";
import { Building2, Clock, Megaphone } from "lucide-react";
import { CreateJobButton, AddSlotButton, EditJobButton } from "./job-form";
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">공고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            채용공고를 등록하고 관리합니다.
          </p>
        </div>
        <CreateJobButton clients={clientOptions} />
      </div>

      {clientsWithJobs.length === 0 ? (
        <div className="rounded-2xl border bg-card py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Megaphone className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-medium">등록된 공고가 없습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">위의 버튼으로 공고를 등록하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {clientsWithJobs.map((client) => (
            <Card key={client.id} className="overflow-hidden py-0 border-gray-400">
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50/50 px-5 py-3 border-b">
                <div className="flex items-center gap-3">
                  {client.main_image_url ? (
                    <Image
                      src={client.main_image_url}
                      alt={client.company_name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">{client.company_name}</h3>
                    <Badge className="bg-blue-500/10 text-blue-700 border-0 text-[10px] font-semibold mt-0.5">
                      시급 {formatWage(client.hourly_wage)}
                    </Badge>
                  </div>
                </div>
                <AddSlotButton clientId={client.id} clients={clientOptions} />
              </div>
              <CardContent className="p-0">
                {client.job_postings.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    등록된 일정이 없습니다.
                  </p>
                ) : (
                  <div className="grid gap-2 p-4">
                    {client.job_postings.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-lg border p-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            className={`text-[11px] font-semibold border-0 ${
                              job.status === "open" ? "bg-blue-500/10 text-blue-700" :
                              "bg-muted text-muted-foreground"
                            }`}
                          >
                            {formatDate(job.work_date)}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-[10px] font-semibold border-0 ${
                                job.status === "open" ? "bg-emerald-500/10 text-emerald-700" :
                                job.status === "closed" ? "bg-red-500/10 text-red-700" :
                                "bg-muted text-muted-foreground"
                              }`}
                            >
                              {job.status === "open" ? "모집중" : job.status === "closed" ? "마감" : "종료"}
                            </Badge>
                            <EditJobButton job={job} />
                            <DeleteJobButton postingId={job.id} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {job.start_time.slice(0, 5)}~{job.end_time.slice(0, 5)}
                          </span>
                          <span className="font-medium">{job.headcount}명</span>
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

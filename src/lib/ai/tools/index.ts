import { getSchedule } from "./get-schedule";
import { getSalary } from "./get-salary";
import { getApplicationStatus } from "./get-application-status";
import { getWorkplaceInfo } from "./get-workplace-info";
import { getAttendanceStatus } from "./get-attendance-status";
import { searchJobs } from "./search-jobs";
import { applyToJob } from "./apply-to-job";
import { escalateToAdmin } from "./escalate-to-admin";

export function getMemberTools(memberId: string, roomId: string, memberName: string) {
  return {
    getSchedule: getSchedule(memberId),
    getSalary: getSalary(memberId),
    getApplicationStatus: getApplicationStatus(memberId),
    getWorkplaceInfo: getWorkplaceInfo(),
    getAttendanceStatus: getAttendanceStatus(memberId),
    searchJobs: searchJobs(),
    applyToJob: applyToJob(memberId),
    escalateToAdmin: escalateToAdmin(roomId, memberName),
  };
}

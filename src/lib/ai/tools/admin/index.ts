import { getAttendanceSummary } from "./get-attendance-summary";
import { getMemberInfo } from "./get-member-info";
import { getStaffingStatus } from "./get-staffing-status";

export function getAdminTools() {
  return {
    getAttendanceSummary: getAttendanceSummary(),
    getMemberInfo: getMemberInfo(),
    getStaffingStatus: getStaffingStatus(),
  };
}

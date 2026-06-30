import { ReportData } from "../types";

export function renderJson(report: ReportData): string {
  return JSON.stringify(report, null, 2);
}

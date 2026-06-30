import { promises as fs } from "fs";
import path from "path";
import { ReportData } from "../types";
import { renderJson } from "./jsonRenderer";
import { renderMarkdown } from "./markdownRenderer";
import { renderHtml } from "./htmlRenderer";

export interface WrittenReportPaths {
  html: string;
  markdown: string;
  json: string;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function writeReports(
  report: ReportData,
  outDir: string
): Promise<WrittenReportPaths> {
  await fs.mkdir(outDir, { recursive: true });
  const ts = timestamp();

  const htmlPath = path.join(outDir, `ai-dev-report-${ts}.html`);
  const mdPath = path.join(outDir, `ai-dev-report-${ts}.md`);
  const jsonPath = path.join(outDir, `ai-dev-report-${ts}.json`);

  const html = await renderHtml(report);
  const markdown = renderMarkdown(report);
  const json = renderJson(report);

  await Promise.all([
    fs.writeFile(htmlPath, html, "utf-8"),
    fs.writeFile(mdPath, markdown, "utf-8"),
    fs.writeFile(jsonPath, json, "utf-8"),
  ]);

  return { html: htmlPath, markdown: mdPath, json: jsonPath };
}

import { promises as fs } from "fs";
import path from "path";
import Handlebars from "handlebars";
import { ReportData } from "../types";

Handlebars.registerHelper("scoreClass", (score: number) => {
  if (score >= 80) return "score-good";
  if (score >= 50) return "score-mid";
  return "score-bad";
});

let cachedTemplate: HandlebarsTemplateDelegate | null = null;

async function getTemplate(): Promise<HandlebarsTemplateDelegate> {
  if (cachedTemplate) return cachedTemplate;
  const templatePath = path.join(__dirname, "..", "templates", "report.hbs");
  const source = await fs.readFile(templatePath, "utf-8");
  cachedTemplate = Handlebars.compile(source);
  return cachedTemplate;
}

export async function renderHtml(report: ReportData): Promise<string> {
  const template = await getTemplate();
  return template({
    ...report,
    isLight: report.mode === "light",
    modeLabel: report.mode === "light" ? "軽量レポート" : "詳細レポート",
  });
}

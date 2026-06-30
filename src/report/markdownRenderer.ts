import { CategoryScore, ReportData } from "../types";

export function renderMarkdown(report: ReportData): string {
  if (report.mode === "light") {
    return renderLightMarkdown(report);
  }
  return renderDetailedMarkdown(report);
}

function renderLightMarkdown(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`# AI開発プロセス診断レポート (軽量)`);
  lines.push("");
  lines.push(`- 生成日時: ${report.generatedAt}`);
  lines.push(`- 比較基準: ${report.baseRef}`);
  lines.push("");
  lines.push(`## 変更概要`);
  lines.push("");
  lines.push(report.summary);
  lines.push("");
  lines.push(`## リスク`);
  lines.push("");
  for (const risk of report.riskNotes) lines.push(`- ${risk}`);
  lines.push("");
  lines.push(`## テスト有無`);
  lines.push("");
  lines.push(
    report.testPresence.hasTestFiles
      ? `テストファイルの変更あり (${report.testPresence.testFileCount}件)`
      : "テストファイルの変更なし"
  );
  lines.push("");
  lines.push(`## 人間が確認すべきポイント`);
  lines.push("");
  for (const cp of report.humanCheckpoints) lines.push(`- ${cp}`);
  lines.push("");
  lines.push(`## 詳細分析をスキップした理由`);
  lines.push("");
  for (const reason of report.sizeJudgement.reasons) lines.push(`- ${reason}`);
  lines.push("");
  return lines.join("\n");
}

function renderDetailedMarkdown(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`# AI開発プロセス診断レポート (詳細)`);
  lines.push("");
  lines.push(`- 生成日時: ${report.generatedAt}`);
  lines.push(`- 比較基準: ${report.baseRef}`);
  lines.push("");
  lines.push(`## 変更概要`);
  lines.push("");
  lines.push(report.summary);
  lines.push("");
  lines.push(`## 詳細レポートと判定した理由`);
  lines.push("");
  for (const reason of report.sizeJudgement.reasons) lines.push(`- ${reason}`);
  lines.push("");

  if (report.overall) {
    lines.push(`## 総合AI開発準備スコア: ${report.overall.score} / 100`);
    lines.push("");
    for (const category of report.overall.categories) {
      lines.push(...renderCategorySection(category));
    }
  }

  lines.push(`## 次回必要なドキュメント`);
  lines.push("");
  if (report.nextDocsNeeded.length === 0) {
    lines.push("なし(必要なドキュメントは揃っています)");
  } else {
    for (const doc of report.nextDocsNeeded) lines.push(`- ${doc.reason}`);
  }
  lines.push("");

  lines.push(`## AIに任せる前に足りなかった情報`);
  lines.push("");
  if (report.missingInfoBeforeAi.length === 0) {
    lines.push("なし");
  } else {
    for (const info of report.missingInfoBeforeAi) lines.push(`- ${info}`);
  }
  lines.push("");

  lines.push(`## 人間が確認すべきポイント`);
  lines.push("");
  for (const cp of report.humanCheckpoints) lines.push(`- ${cp}`);
  lines.push("");

  lines.push(`## リスク`);
  lines.push("");
  for (const risk of report.riskNotes) lines.push(`- ${risk}`);
  lines.push("");

  lines.push(`## 変更ファイル一覧`);
  lines.push("");
  lines.push("| ファイル | 状態 | 追加 | 削除 |");
  lines.push("|---|---|---|---|");
  for (const file of report.diff.files) {
    lines.push(`| ${file.path} | ${file.status} | +${file.insertions} | -${file.deletions} |`);
  }
  lines.push("");

  return lines.join("\n");
}

function renderCategorySection(category: CategoryScore): string[] {
  const lines: string[] = [];
  lines.push(`### ${category.label}: ${category.score} / 100`);
  lines.push("");
  if (category.deductionReasons.length > 0) {
    lines.push(`**減点理由:**`);
    lines.push("");
    for (const reason of category.deductionReasons) lines.push(`- ${reason}`);
    lines.push("");
  }
  if (category.improvements.length > 0) {
    lines.push(`**改善案:**`);
    lines.push("");
    for (const improvement of category.improvements) lines.push(`- ${improvement}`);
    lines.push("");
  }
  return lines;
}

#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import { GitDiffCollector } from "./git/gitDiffCollector";
import { classifyChangedFiles } from "./analyzers/fileClassifier";
import { scanDocs } from "./analyzers/docsScanner";
import { buildScoringContext } from "./scoring/context";
import { computeOverallScore } from "./scoring/scorer";
import { judgeReportSize } from "./scoring/sizeClassifier";
import { buildReportData } from "./report/buildReportData";
import { writeReports } from "./report/writeReports";

const program = new Command();

program
  .name("ai-dev-doctor")
  .description("AIコーディングを使った開発プロセスを診断し、レポートを生成するCLIツール");

program
  .command("report")
  .description("git差分を分析し、AI開発プロセス診断レポートを生成する")
  .option("--since <ref>", "比較基準のGit参照", "main")
  .option("--out <dir>", "レポート出力先ディレクトリ", "reports")
  .action(async (opts: { since: string; out: string }) => {
    try {
      await runReport(opts.since, opts.out);
    } catch (err) {
      console.error(`エラー: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

async function runReport(baseRef: string, outDirOption: string): Promise<void> {
  const cwd = process.cwd();
  const outDir = path.isAbsolute(outDirOption) ? outDirOption : path.join(cwd, outDirOption);

  console.log(`[ai-dev-doctor] ${baseRef} を基準に差分を分析しています...`);
  const collector = new GitDiffCollector({ cwd, baseRef });
  const diff = await collector.collect();

  const classification = classifyChangedFiles(diff.files);
  const docFiles = await scanDocs({ cwd, changedFiles: diff.files });
  const sizeJudgement = judgeReportSize(diff, classification);

  console.log(
    `[ai-dev-doctor] 変更ファイル ${diff.totalFilesChanged}件 / +${diff.totalInsertions} -${diff.totalDeletions} 行 → ${
      sizeJudgement.mode === "light" ? "軽量レポート" : "詳細レポート"
    }`
  );

  let overall;
  const scoringContext = buildScoringContext(docFiles, classification, diff);
  if (sizeJudgement.mode === "detailed") {
    overall = computeOverallScore(scoringContext);
  }

  const reportData = buildReportData({
    diff,
    docFiles,
    classification,
    sizeJudgement,
    scoringContext,
    overall,
  });

  const written = await writeReports(reportData, outDir);

  console.log(`[ai-dev-doctor] レポートを生成しました:`);
  console.log(`  - ${written.html}`);
  console.log(`  - ${written.markdown}`);
  console.log(`  - ${written.json}`);
  if (overall) {
    console.log(`[ai-dev-doctor] 総合AI開発準備スコア: ${overall.score} / 100`);
  }
}

program.parseAsync(process.argv);

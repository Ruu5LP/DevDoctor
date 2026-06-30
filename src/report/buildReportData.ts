import {
  DiffSummary,
  DocCategory,
  DocFile,
  FileClassification,
  NextDocsNeeded,
  OverallScore,
  ReportData,
  SizeJudgement,
} from "../types";
import { hasDoc, ScoringContext } from "../scoring/context";

const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  requirements: "requirements.md (要件定義)",
  design: "design.md (設計)",
  api: "api.md (API仕様)",
  database: "database.md (DB設計)",
  sequence: "sequence.md (シーケンス図)",
  test: "test.md (テスト計画)",
  aiInstructions: "ai-instructions.md (AIへの指示)",
};

export interface BuildReportDataInput {
  diff: DiffSummary;
  docFiles: DocFile[];
  classification: FileClassification;
  sizeJudgement: SizeJudgement;
  scoringContext?: ScoringContext;
  overall?: OverallScore;
}

export function buildReportData(input: BuildReportDataInput): ReportData {
  const { diff, classification, sizeJudgement, overall, scoringContext } = input;

  const testPresence = {
    hasTestFiles: classification.testFiles.length > 0,
    testFileCount: classification.testFiles.length,
  };

  const riskNotes = buildRiskNotes(diff, classification);
  const summary = buildSummary(diff, classification);

  if (sizeJudgement.mode === "light") {
    return {
      generatedAt: new Date().toISOString(),
      baseRef: diff.baseRef,
      mode: "light",
      diff,
      classification: {
        testFileCount: classification.testFiles.length,
        dbFileCount: classification.dbFiles.length,
        apiFileCount: classification.apiFiles.length,
        docFileCount: classification.docFiles.length,
      },
      sizeJudgement,
      nextDocsNeeded: [],
      missingInfoBeforeAi: [],
      humanCheckpoints: buildLightHumanCheckpoints(testPresence.hasTestFiles),
      riskNotes,
      testPresence,
      summary,
    };
  }

  const nextDocsNeeded = scoringContext ? buildNextDocsNeeded(scoringContext) : [];
  const missingInfoBeforeAi = overall ? buildMissingInfoBeforeAi(overall) : [];
  const humanCheckpoints = buildDetailedHumanCheckpoints(diff, classification, overall);

  return {
    generatedAt: new Date().toISOString(),
    baseRef: diff.baseRef,
    mode: "detailed",
    diff,
    classification: {
      testFileCount: classification.testFiles.length,
      dbFileCount: classification.dbFiles.length,
      apiFileCount: classification.apiFiles.length,
      docFileCount: classification.docFiles.length,
    },
    sizeJudgement,
    overall,
    nextDocsNeeded,
    missingInfoBeforeAi,
    humanCheckpoints,
    riskNotes,
    testPresence,
    summary,
  };
}

function buildSummary(diff: DiffSummary, classification: FileClassification): string {
  return (
    `${diff.baseRef} を基準に ${diff.totalFilesChanged} ファイルが変更され、` +
    `+${diff.totalInsertions}/-${diff.totalDeletions} 行の差分があります。` +
    `(テスト${classification.testFiles.length}件 / DB関連${classification.dbFiles.length}件 / API関連${classification.apiFiles.length}件 / docs${classification.docFiles.length}件)`
  );
}

function buildRiskNotes(diff: DiffSummary, classification: FileClassification): string[] {
  const risks: string[] = [];
  if (classification.dbFiles.length > 0) {
    risks.push("DBスキーマ変更が含まれるため、マイグレーション手順とロールバック方針を確認すること");
  }
  if (classification.apiFiles.length > 0) {
    risks.push("API変更が含まれるため、後方互換性とクライアント影響を確認すること");
  }
  if (classification.testFiles.length === 0) {
    risks.push("テストファイルの変更が見当たらないため、手動でのデグレ確認が必要");
  }
  if (diff.totalDeletions > diff.totalInsertions * 2 && diff.totalDeletions > 50) {
    risks.push("削除行数が追加行数に比べて大きいため、意図しない機能削除がないか確認すること");
  }
  if (risks.length === 0) {
    risks.push("特筆すべき高リスク要因は検出されませんでした");
  }
  return risks;
}

function buildLightHumanCheckpoints(hasTestFiles: boolean): string[] {
  const checkpoints = ["差分の意図と変更ファイルが一致しているか確認する"];
  if (!hasTestFiles) {
    checkpoints.push("テストが不要な変更か、念のため確認する");
  }
  return checkpoints;
}

function buildDetailedHumanCheckpoints(
  diff: DiffSummary,
  classification: FileClassification,
  overall?: OverallScore
): string[] {
  const checkpoints: string[] = [
    "AIが生成した差分が要件・設計ドキュメントの意図と一致しているか確認する",
  ];
  if (classification.dbFiles.length > 0) {
    checkpoints.push("マイグレーションを本番相当のデータで試し、ロールバック手順を確認する");
  }
  if (classification.apiFiles.length > 0) {
    checkpoints.push("APIのレスポンス互換性を既存クライアントの観点で確認する");
  }
  if (overall) {
    const lowScoreCategories = overall.categories.filter((c) => c.score < 60);
    for (const cat of lowScoreCategories) {
      checkpoints.push(`${cat.label}が低いため、該当ドキュメントの内容を人間がレビューする`);
    }
  }
  if (diff.totalFilesChanged > 0 && classification.testFiles.length === 0) {
    checkpoints.push("テストが追加されていないため、影響範囲を手動で確認する");
  }
  return checkpoints;
}

function buildNextDocsNeeded(ctx: ScoringContext): NextDocsNeeded[] {
  const categories: DocCategory[] = [
    "requirements",
    "design",
    "api",
    "database",
    "sequence",
    "test",
    "aiInstructions",
  ];
  const result: NextDocsNeeded[] = [];
  for (const category of categories) {
    if (!hasDoc(ctx, category)) {
      result.push({
        category,
        reason: `${DOC_CATEGORY_LABELS[category]} が見つからなかったため、次回はAI着手前に準備する`,
      });
    }
  }
  return result;
}

function buildMissingInfoBeforeAi(overall: OverallScore): string[] {
  const missing: string[] = [];
  for (const cat of overall.categories) {
    for (const reason of cat.deductionReasons) {
      missing.push(`[${cat.label}] ${reason}`);
    }
  }
  return missing;
}

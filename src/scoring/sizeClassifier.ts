import { DiffSummary, FileClassification, SizeJudgement } from "../types";
import { detectLayers, hasAuthRelatedChange, hasPaymentOrExternalChange } from "../analyzers/fileClassifier";

export interface SizeThresholds {
  maxFilesForLight: number;
  maxInsertionsForLight: number;
}

export const DEFAULT_THRESHOLDS: SizeThresholds = {
  maxFilesForLight: 8,
  maxInsertionsForLight: 150,
};

/**
 * 変更が「大きいタスク」かどうかを判定する。
 * いずれか1つでも該当すれば詳細レポート(detailed)、それ以外は軽量レポート(light)とする。
 */
export function judgeReportSize(
  diff: DiffSummary,
  classification: FileClassification,
  thresholds: SizeThresholds = DEFAULT_THRESHOLDS
): SizeJudgement {
  const reasons: string[] = [];

  if (diff.totalFilesChanged > thresholds.maxFilesForLight) {
    reasons.push(
      `変更ファイル数が多い (${diff.totalFilesChanged}件 > ${thresholds.maxFilesForLight}件)`
    );
  }

  if (diff.totalInsertions > thresholds.maxInsertionsForLight) {
    reasons.push(
      `追加行数が多い (${diff.totalInsertions}行 > ${thresholds.maxInsertionsForLight}行)`
    );
  }

  if (classification.dbFiles.length > 0) {
    reasons.push(`DB変更が含まれる (${classification.dbFiles.length}ファイル)`);
  }

  if (classification.apiFiles.length > 0) {
    reasons.push(`API変更が含まれる (${classification.apiFiles.length}ファイル)`);
  }

  if (hasAuthRelatedChange(diff.files)) {
    reasons.push("認証/権限まわりの変更が含まれる");
  }

  if (hasPaymentOrExternalChange(diff.files)) {
    reasons.push("決済/通知/外部API連携の変更が含まれる");
  }

  const layers = detectLayers(diff.files);
  const significantLayers = Array.from(layers).filter((l) => l !== "other" && l !== "docs");
  if (significantLayers.length >= 3) {
    reasons.push(`複数レイヤーにまたがる変更がある (${significantLayers.join(", ")})`);
  }

  const isLargeWithoutTests =
    classification.testFiles.length === 0 &&
    (diff.totalFilesChanged > thresholds.maxFilesForLight ||
      diff.totalInsertions > thresholds.maxInsertionsForLight);
  if (isLargeWithoutTests) {
    reasons.push("変更規模が大きいにもかかわらずテストの追加がない");
  }

  if (reasons.length > 0) {
    return { mode: "detailed", reasons };
  }

  return {
    mode: "light",
    reasons: [
      "変更ファイル数が少ない",
      "追加/削除行数が少ない",
      "docs変更・DB変更・API変更が含まれない",
      "テストへの影響が小さい",
    ],
  };
}

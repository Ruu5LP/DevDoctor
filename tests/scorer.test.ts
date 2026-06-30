import { describe, it, expect } from "vitest";
import { buildScoringContext } from "../src/scoring/context";
import { computeOverallScore } from "../src/scoring/scorer";
import { DiffSummary, DocFile, FileClassification } from "../src/types";

const emptyDiff: DiffSummary = {
  baseRef: "main",
  files: [],
  totalFilesChanged: 0,
  totalInsertions: 0,
  totalDeletions: 0,
};

const emptyClassification: FileClassification = {
  testFiles: [],
  dbFiles: [],
  apiFiles: [],
  docFiles: [],
};

describe("computeOverallScore", () => {
  it("scores 0 readiness/quality when no docs and no relevant file changes exist", () => {
    const ctx = buildScoringContext([], emptyClassification, emptyDiff);
    const overall = computeOverallScore(ctx);
    // design-quality の DB変更理由/API入出力ルールは、該当する変更がない場合は
    // 「該当なし」として満たされる扱いになるため、設計品質以外は0になることを確認する
    const requirementsReadiness = overall.categories.find((c) => c.id === "requirementsReadiness");
    const requirementsQuality = overall.categories.find((c) => c.id === "requirementsQuality");
    const testReadiness = overall.categories.find((c) => c.id === "testReadiness");
    expect(requirementsReadiness?.score).toBe(0);
    expect(requirementsQuality?.score).toBe(0);
    expect(testReadiness?.score).toBe(0);
    expect(requirementsReadiness?.deductionReasons.length).toBeGreaterThan(0);
  });

  it("gives full readiness score and partial quality score for a rich requirements doc", () => {
    const requirementsDoc: DocFile = {
      category: "requirements",
      path: "docs/requirements.md",
      content: [
        "## 目的",
        "ユーザー登録機能を作る",
        "## 対象外",
        "決済機能はスコープ外",
        "## 正常系",
        "メールアドレスとパスワードで登録できる",
        "## 異常系",
        "重複メールはエラーを返す",
        "## 権限",
        "ゲストのみ利用可能",
      ].join("\n"),
      changedInDiff: true,
    };
    const ctx = buildScoringContext([requirementsDoc], emptyClassification, emptyDiff);
    const overall = computeOverallScore(ctx);
    const readiness = overall.categories.find((c) => c.id === "requirementsReadiness");
    const quality = overall.categories.find((c) => c.id === "requirementsQuality");
    expect(readiness?.score).toBe(100);
    expect(quality?.score).toBeGreaterThan(0);
    expect(quality?.score).toBeLessThan(100);
    expect(quality?.deductionReasons).toContain("状態遷移が未定義");
  });
});

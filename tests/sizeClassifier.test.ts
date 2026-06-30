import { describe, it, expect } from "vitest";
import { judgeReportSize } from "../src/scoring/sizeClassifier";
import { ChangedFile, DiffSummary, FileClassification } from "../src/types";

function file(path: string, insertions = 5, deletions = 1): ChangedFile {
  return { path, status: "M", insertions, deletions };
}

function diffOf(files: ChangedFile[]): DiffSummary {
  return {
    baseRef: "main",
    files,
    totalFilesChanged: files.length,
    totalInsertions: files.reduce((s, f) => s + f.insertions, 0),
    totalDeletions: files.reduce((s, f) => s + f.deletions, 0),
  };
}

function emptyClassification(): FileClassification {
  return { testFiles: [], dbFiles: [], apiFiles: [], docFiles: [] };
}

describe("judgeReportSize", () => {
  it("returns light for a small, low-risk change", () => {
    const files = [file("src/utils/helpers.ts", 10, 2)];
    const judgement = judgeReportSize(diffOf(files), emptyClassification());
    expect(judgement.mode).toBe("light");
  });

  it("returns detailed when DB files are changed", () => {
    const files = [file("migrations/add_users.sql", 5, 0)];
    const classification: FileClassification = { ...emptyClassification(), dbFiles: files };
    const judgement = judgeReportSize(diffOf(files), classification);
    expect(judgement.mode).toBe("detailed");
    expect(judgement.reasons.some((r) => r.includes("DB変更"))).toBe(true);
  });

  it("returns detailed when many files changed", () => {
    const files = Array.from({ length: 12 }, (_, i) => file(`src/file${i}.ts`, 5, 1));
    const judgement = judgeReportSize(diffOf(files), emptyClassification());
    expect(judgement.mode).toBe("detailed");
  });

  it("returns detailed when auth-related files changed", () => {
    const files = [file("src/auth/login.ts", 20, 5)];
    const judgement = judgeReportSize(diffOf(files), emptyClassification());
    expect(judgement.mode).toBe("detailed");
    expect(judgement.reasons.some((r) => r.includes("認証"))).toBe(true);
  });
});

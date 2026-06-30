/** 変更されたファイル1件分の情報 */
export interface ChangedFile {
  path: string;
  status: string; // A: added, M: modified, D: deleted, R: renamed
  insertions: number;
  deletions: number;
}

/** git diff から収集した生データ */
export interface DiffSummary {
  baseRef: string;
  files: ChangedFile[];
  totalInsertions: number;
  totalDeletions: number;
  totalFilesChanged: number;
}

/** ドキュメントカテゴリ */
export type DocCategory =
  | "requirements"
  | "design"
  | "api"
  | "database"
  | "sequence"
  | "test"
  | "aiInstructions";

/** リポジトリ内で見つかったドキュメントファイル */
export interface DocFile {
  category: DocCategory;
  path: string;
  content: string;
  changedInDiff: boolean;
}

/** ファイル分類結果 */
export interface FileClassification {
  testFiles: ChangedFile[];
  dbFiles: ChangedFile[];
  apiFiles: ChangedFile[];
  docFiles: ChangedFile[];
}

export type ScoreCategoryId =
  | "requirementsReadiness"
  | "requirementsQuality"
  | "designReadiness"
  | "designQuality"
  | "testReadiness"
  | "testQuality"
  | "aiInstructionQuality";

/** 1つの評価ルールの結果 */
export interface RuleResult {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  deductionReason?: string;
  improvement?: string;
}

/** カテゴリ単位のスコア結果 */
export interface CategoryScore {
  id: ScoreCategoryId;
  label: string;
  score: number; // 0-100
  maxScore: number; // 常に100
  ruleResults: RuleResult[];
  deductionReasons: string[];
  improvements: string[];
}

export interface OverallScore {
  score: number; // 0-100
  categories: CategoryScore[];
}

export type ReportMode = "light" | "detailed";

export interface SizeJudgement {
  mode: ReportMode;
  reasons: string[]; // 詳細判定の根拠 (light の場合は「スキップ理由」として使う)
}

export interface NextDocsNeeded {
  category: DocCategory;
  reason: string;
}

export interface ReportData {
  generatedAt: string;
  baseRef: string;
  mode: ReportMode;
  diff: DiffSummary;
  classification: {
    testFileCount: number;
    dbFileCount: number;
    apiFileCount: number;
    docFileCount: number;
  };
  sizeJudgement: SizeJudgement;
  overall?: OverallScore;
  nextDocsNeeded: NextDocsNeeded[];
  missingInfoBeforeAi: string[];
  humanCheckpoints: string[];
  riskNotes: string[];
  testPresence: {
    hasTestFiles: boolean;
    testFileCount: number;
  };
  summary: string;
}

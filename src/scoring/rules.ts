import { ScoreCategoryId } from "../types";
import { ScoringContext, docContent, hasDoc } from "./context";

export interface ScoringRule {
  id: string;
  category: ScoreCategoryId;
  label: string;
  weight: number;
  /** ルールが満たされていれば true */
  check: (ctx: ScoringContext) => boolean;
  /** 不合格時に表示する減点理由 */
  deductionReason: string;
  /** 不合格時に表示する改善案 */
  improvement: string;
}

function contentMatches(content: string, pattern: RegExp): boolean {
  return content.trim().length > 0 && pattern.test(content);
}

// ---------------------------------------------------------------------------
// 要件準備スコア: 要件ドキュメントが存在するか
// ---------------------------------------------------------------------------
const requirementsReadinessRules: ScoringRule[] = [
  {
    id: "req-readiness-doc-exists",
    category: "requirementsReadiness",
    label: "requirements.md が存在する",
    weight: 1,
    check: (ctx) => hasDoc(ctx, "requirements"),
    deductionReason: "要件ドキュメント(requirements.md 等)が見つからない",
    improvement: "docs/requirements.md を作成し、何を作るかを明文化する",
  },
];

// ---------------------------------------------------------------------------
// 要件品質スコア: 要件ドキュメントの中身がAI開発に十分か
// ---------------------------------------------------------------------------
const requirementsQualityRules: ScoringRule[] = [
  {
    id: "req-quality-what-to-build",
    category: "requirementsQuality",
    label: "何を作るかが明確",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "requirements"), /目的|概要|ゴール|goal|purpose|やること/i),
    deductionReason: "「何を作るか」が明文化されていない",
    improvement: "目的・概要・ゴールのセクションを追加する",
  },
  {
    id: "req-quality-what-not-to-build",
    category: "requirementsQuality",
    label: "何を作らないかが明確",
    weight: 1,
    check: (ctx) =>
      contentMatches(
        docContent(ctx, "requirements"),
        /やらないこと|対象外|スコープ外|非対象|out of scope|non-goals?/i
      ),
    deductionReason: "「何を作らないか(非対象範囲)」が未定義",
    improvement: "対象外・非ゴールのセクションを追加し、AIの作業範囲が膨らまないようにする",
  },
  {
    id: "req-quality-happy-path",
    category: "requirementsQuality",
    label: "正常系がある",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "requirements"), /正常系|happy path|基本フロー/i),
    deductionReason: "正常系の振る舞いが未定義",
    improvement: "代表的な正常系シナリオを箇条書きで追記する",
  },
  {
    id: "req-quality-error-path",
    category: "requirementsQuality",
    label: "異常系がある",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "requirements"), /異常系|エラー|exception|error case/i),
    deductionReason: "異常系が未定義",
    improvement: "エラー時のレスポンスと画面表示を定義する",
  },
  {
    id: "req-quality-permission",
    category: "requirementsQuality",
    label: "権限条件がある",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "requirements"), /権限|ロール|role|permission|アクセス制御/i),
    deductionReason: "権限条件が未定義",
    improvement: "誰がこの機能を使えるか(ロール・権限)を明記する",
  },
  {
    id: "req-quality-state-transition",
    category: "requirementsQuality",
    label: "状態遷移がある",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "requirements"), /状態遷移|ステータス|state transition|ステート/i),
    deductionReason: "状態遷移が未定義",
    improvement: "対象データ・処理の状態遷移図または一覧を追記する",
  },
  {
    id: "req-quality-verifiable-done",
    category: "requirementsQuality",
    label: "完了条件が検証可能",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "requirements"), /完了条件|done条件|完了基準|definition of done/i),
    deductionReason: "完了条件が検証可能になっていない",
    improvement: "誰が見ても判定できる完了条件(Done条件)を箇条書きで定義する",
  },
  {
    id: "req-quality-acceptance-criteria",
    category: "requirementsQuality",
    label: "受け入れ条件がある",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "requirements"), /受け入れ条件|acceptance criteria/i),
    deductionReason: "受け入れ条件が未定義",
    improvement: "Given-When-Then 形式などで受け入れ条件を追記する",
  },
];

// ---------------------------------------------------------------------------
// 設計準備スコア: 設計関連ドキュメントが存在するか
// ---------------------------------------------------------------------------
const designReadinessRules: ScoringRule[] = [
  {
    id: "design-readiness-design-doc",
    category: "designReadiness",
    label: "design.md が存在する",
    weight: 1,
    check: (ctx) => hasDoc(ctx, "design"),
    deductionReason: "設計ドキュメント(design.md)が見つからない",
    improvement: "docs/design.md を作成し、変更方針を明文化する",
  },
  {
    id: "design-readiness-api-doc",
    category: "designReadiness",
    label: "api.md が存在する",
    weight: 1,
    check: (ctx) => hasDoc(ctx, "api"),
    deductionReason: "API仕様ドキュメント(api.md)が見つからない",
    improvement: "docs/api.md を作成し、エンドポイント仕様を明文化する",
  },
  {
    id: "design-readiness-database-doc",
    category: "designReadiness",
    label: "database.md が存在する",
    weight: 1,
    check: (ctx) => hasDoc(ctx, "database"),
    deductionReason: "DB設計ドキュメント(database.md)が見つからない",
    improvement: "docs/database.md を作成し、テーブル・カラム変更を明文化する",
  },
  {
    id: "design-readiness-sequence-doc",
    category: "designReadiness",
    label: "sequence.md が存在する",
    weight: 1,
    check: (ctx) => hasDoc(ctx, "sequence"),
    deductionReason: "シーケンス図ドキュメント(sequence.md)が見つからない",
    improvement: "docs/sequence.md を作成し、処理の流れを図示する",
  },
];

// ---------------------------------------------------------------------------
// 設計品質スコア
// ---------------------------------------------------------------------------
const designQualityRules: ScoringRule[] = [
  {
    id: "design-quality-target-clear",
    category: "designQuality",
    label: "変更対象が明確",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "design"), /対象ファイル|変更対象|target|対象範囲/i),
    deductionReason: "変更対象が明文化されていない",
    improvement: "変更するファイル・モジュールを一覧化する",
  },
  {
    id: "design-quality-impact",
    category: "designQuality",
    label: "既存仕様への影響が書かれている",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "design"), /既存|影響|impact|互換性/i),
    deductionReason: "既存仕様への影響が未記載",
    improvement: "既存機能・他モジュールへの影響範囲を記載する",
  },
  {
    id: "design-quality-db-reason",
    category: "designQuality",
    label: "DB変更理由がある",
    weight: 1,
    check: (ctx) =>
      !ctx.classification.dbFiles.length ||
      contentMatches(docContent(ctx, "database") || docContent(ctx, "design"), /理由|なぜ|背景|reason|why/i),
    deductionReason: "DB変更の理由が説明されていない",
    improvement: "なぜそのテーブル・カラム変更が必要かを記載する",
  },
  {
    id: "design-quality-api-io",
    category: "designQuality",
    label: "API入出力がある",
    weight: 1,
    check: (ctx) =>
      !ctx.classification.apiFiles.length ||
      contentMatches(
        docContent(ctx, "api") || docContent(ctx, "design"),
        /request|response|入力|出力|リクエスト|レスポンス/i
      ),
    deductionReason: "APIの入出力仕様が未記載",
    improvement: "リクエスト/レスポンスの形式とサンプルを記載する",
  },
  {
    id: "design-quality-error-cases",
    category: "designQuality",
    label: "エラーケースがある",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "design"), /エラー|失敗|error|failure/i),
    deductionReason: "設計上のエラーケースが未記載",
    improvement: "想定されるエラーケースとハンドリング方針を記載する",
  },
  {
    id: "design-quality-rollback",
    category: "designQuality",
    label: "ロールバック方針がある",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "design"), /ロールバック|rollback|切り戻し/i),
    deductionReason: "ロールバック方針が未記載",
    improvement: "問題発生時の切り戻し手順を記載する",
  },
  {
    id: "design-quality-flow",
    category: "designQuality",
    label: "処理フローが説明されている",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "design"), /フロー|flow|シーケンス|sequence|処理の流れ/i) ||
      hasDoc(ctx, "sequence"),
    deductionReason: "処理フローの説明が不足",
    improvement: "処理の流れを箇条書きまたはシーケンス図で説明する",
  },
];

// ---------------------------------------------------------------------------
// テスト準備スコア
// ---------------------------------------------------------------------------
const testReadinessRules: ScoringRule[] = [
  {
    id: "test-readiness-doc-exists",
    category: "testReadiness",
    label: "test.md が存在する",
    weight: 1,
    check: (ctx) => hasDoc(ctx, "test"),
    deductionReason: "テスト計画ドキュメント(test.md)が見つからない",
    improvement: "docs/test.md を作成し、テスト観点を明文化する",
  },
  {
    id: "test-readiness-test-files",
    category: "testReadiness",
    label: "テストファイルがある",
    weight: 1,
    check: (ctx) => ctx.classification.testFiles.length > 0,
    deductionReason: "今回の変更にテストファイルが含まれていない",
    improvement: "変更内容に対応するテストファイルを追加する",
  },
];

// ---------------------------------------------------------------------------
// テスト品質スコア
// ---------------------------------------------------------------------------
const testQualityRules: ScoringRule[] = [
  {
    id: "test-quality-happy-path",
    category: "testQuality",
    label: "正常系",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "test"), /正常系|happy path/i),
    deductionReason: "正常系のテスト観点が未記載",
    improvement: "正常系のテストケースを明記する",
  },
  {
    id: "test-quality-error-path",
    category: "testQuality",
    label: "異常系",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "test"), /異常系|エラー|error case/i),
    deductionReason: "異常系のテスト観点が未記載",
    improvement: "異常系・例外系のテストケースを明記する",
  },
  {
    id: "test-quality-permission",
    category: "testQuality",
    label: "権限",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "test"), /権限|permission|role/i),
    deductionReason: "権限まわりのテスト観点が未記載",
    improvement: "権限・ロールごとの挙動確認を追記する",
  },
  {
    id: "test-quality-boundary",
    category: "testQuality",
    label: "境界値",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "test"), /境界値|boundary/i),
    deductionReason: "境界値のテスト観点が未記載",
    improvement: "境界値・上限下限のテストケースを追記する",
  },
  {
    id: "test-quality-regression",
    category: "testQuality",
    label: "既存機能への影響",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "test"), /既存機能|regression|デグレ|回帰/i),
    deductionReason: "既存機能への影響確認(デグレ確認)が未記載",
    improvement: "既存機能に対する回帰確認の観点を追記する",
  },
  {
    id: "test-quality-manual-check",
    category: "testQuality",
    label: "手動確認項目",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "test"), /手動確認|manual check|手動テスト/i),
    deductionReason: "手動確認項目が未記載",
    improvement: "自動テストでカバーできない手動確認項目を追記する",
  },
  {
    id: "test-quality-commands",
    category: "testQuality",
    label: "実行したテストコマンド",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "test"), /npm test|yarn test|pnpm test|pytest|テストコマンド|test command|```/),
    deductionReason: "実行したテストコマンドが記載されていない",
    improvement: "実際に実行したテストコマンドと結果を記載する",
  },
];

// ---------------------------------------------------------------------------
// AI指示品質スコア
// ---------------------------------------------------------------------------
const aiInstructionQualityRules: ScoringRule[] = [
  {
    id: "ai-quality-purpose",
    category: "aiInstructionQuality",
    label: "目的が明確",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "aiInstructions"), /目的|purpose|goal/i),
    deductionReason: "AIへの指示に目的が明記されていない",
    improvement: "何のためにこの変更を行うかをAI指示の冒頭に明記する",
  },
  {
    id: "ai-quality-scope",
    category: "aiInstructionQuality",
    label: "変更範囲が限定されている",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "aiInstructions"), /変更範囲|対象範囲|scope|対象ファイル/i),
    deductionReason: "変更範囲が限定されていない",
    improvement: "触ってよいファイル・触ってはいけないファイルを明記する",
  },
  {
    id: "ai-quality-prohibitions",
    category: "aiInstructionQuality",
    label: "禁止事項がある",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "aiInstructions"), /禁止|やってはいけない|do not|don't|してはいけない/i),
    deductionReason: "禁止事項が明記されていない",
    improvement: "AIにやってほしくないことを明示的に禁止事項として書く",
  },
  {
    id: "ai-quality-references",
    category: "aiInstructionQuality",
    label: "参照すべきファイルが指定されている",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "aiInstructions"), /参照|reference|該当ファイル|ファイルパス/i),
    deductionReason: "参照すべきファイルが指定されていない",
    improvement: "AIが読むべき既存ファイル・ドキュメントを指定する",
  },
  {
    id: "ai-quality-done-condition",
    category: "aiInstructionQuality",
    label: "完了条件がある",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "aiInstructions"), /完了条件|done|完了基準/i),
    deductionReason: "完了条件が明記されていない",
    improvement: "どうなったら完了とみなすかをAI指示に明記する",
  },
  {
    id: "ai-quality-no-assumption",
    category: "aiInstructionQuality",
    label: "勝手にやらないことが書かれている",
    weight: 1,
    check: (ctx) =>
      contentMatches(docContent(ctx, "aiInstructions"), /勝手に|独自判断|許可なく|without asking|確認してから/i),
    deductionReason: "「勝手に判断して進めないこと」が明記されていない",
    improvement: "不明点がある場合は確認を取ってから進めるよう明記する",
  },
  {
    id: "ai-quality-output-format",
    category: "aiInstructionQuality",
    label: "出力形式が指定されている",
    weight: 1,
    check: (ctx) => contentMatches(docContent(ctx, "aiInstructions"), /出力形式|フォーマット|format|形式で/i),
    deductionReason: "AIへの出力形式の指定がない",
    improvement: "報告や成果物の出力形式(構成・フォーマット)を指定する",
  },
];

export const ALL_RULES: ScoringRule[] = [
  ...requirementsReadinessRules,
  ...requirementsQualityRules,
  ...designReadinessRules,
  ...designQualityRules,
  ...testReadinessRules,
  ...testQualityRules,
  ...aiInstructionQualityRules,
];

export const CATEGORY_LABELS: Record<ScoreCategoryId, string> = {
  requirementsReadiness: "要件準備スコア",
  requirementsQuality: "要件品質スコア",
  designReadiness: "設計準備スコア",
  designQuality: "設計品質スコア",
  testReadiness: "テスト準備スコア",
  testQuality: "テスト品質スコア",
  aiInstructionQuality: "AI指示品質スコア",
};

/** 総合スコア算出時の各カテゴリの重み */
export const OVERALL_WEIGHTS: Record<ScoreCategoryId, number> = {
  requirementsReadiness: 1,
  requirementsQuality: 1.5,
  designReadiness: 1,
  designQuality: 1.5,
  testReadiness: 1,
  testQuality: 1.5,
  aiInstructionQuality: 1.5,
};

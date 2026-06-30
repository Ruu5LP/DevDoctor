# DevDoctor (ai-dev-doctor)

Claude Code / Codex などのAIコーディングを使った開発の後に、`git diff` とプロジェクトの `docs/` を分析し、
**AI開発プロセスの品質**を診断するCLIツールです。

「スコアが出て終わり」ではなく、

- なぜそのスコアになったか(減点理由)
- 次に何を直せばAI開発がうまくいくか(改善案)
- 次回ドキュメントとして何を用意すべきか
- 人間が確認すべきポイント

までをレポートとして出力します。小さな変更では軽量レポートに留め、大きな変更(DB/API/認証/決済など)では詳細レポートを出します。

## インストール / セットアップ

```bash
npm install
npm run build
```

ローカルでビルドせずに動かす場合は `npm run dev -- report --since main` でも実行できます。

CLIとして `ai-dev-doctor` コマンドを使いたい場合はリンクしてください。

```bash
npm link
```

## 使い方

分析したいリポジトリのルート(Gitリポジトリ)で実行します。

```bash
ai-dev-doctor report --since main
```

オプション:

| オプション | デフォルト | 説明 |
|---|---|---|
| `--since <ref>` | `main` | 比較基準のGit参照(ブランチ名・コミットハッシュなど) |
| `--out <dir>` | `reports` | レポート出力先ディレクトリ |

実行すると、`main` との merge-base からの差分(コミット済み・ステージ済みの変更を含むワーキングツリーの内容)を分析し、以下を生成します。

```text
reports/
  ai-dev-report-{timestamp}.html
  ai-dev-report-{timestamp}.md
  ai-dev-report-{timestamp}.json
```

> 未コミット(`git add` 前)の新規ファイルは Git の仕組み上 diff に現れません。新規ファイルを分析対象に含めたい場合は `git add` してから実行してください。

## ドキュメントの置き場所

以下のファイルを `docs/` 配下に置くと、準備スコア・品質スコアの算出対象になります(ファイル名にキーワードが含まれていれば認識されます。例: `docs/requirements.md`, `docs/01_requirements.md` など)。

| カテゴリ | ファイル名の例 | 内容 |
|---|---|---|
| 要件 | `docs/requirements.md` | 何を作る/作らないか、正常系・異常系、権限、状態遷移、完了条件、受け入れ条件 |
| 設計 | `docs/design.md` | 変更対象、既存仕様への影響、エラーケース、ロールバック方針、処理フロー |
| API | `docs/api.md` | エンドポイントの入出力 |
| DB | `docs/database.md` | スキーマ変更とその理由 |
| シーケンス | `docs/sequence.md` | 処理の流れ |
| テスト | `docs/test.md` | 正常系/異常系/権限/境界値/既存機能への影響/手動確認項目/実行コマンド |
| AI指示 | `docs/ai-instructions.md` または `CLAUDE.md` | AIへの指示内容(目的・範囲・禁止事項・参照ファイル・完了条件など) |

## スコア仕様

以下の8つのスコアを算出します(0〜100点)。

```text
要件準備スコア      … requirements.md が存在するか
要件品質スコア      … 何を作る/作らない・正常系・異常系・権限・状態遷移・完了条件・受け入れ条件が書かれているか
設計準備スコア      … design.md / api.md / database.md / sequence.md が存在するか
設計品質スコア      … 変更対象・既存影響・DB変更理由・API入出力・エラーケース・ロールバック・処理フローが書かれているか
テスト準備スコア    … test.md とテストファイルが存在するか
テスト品質スコア    … 正常系/異常系/権限/境界値/既存影響/手動確認/実行コマンドが書かれているか
AI指示品質スコア    … 目的/範囲/禁止事項/参照ファイル/完了条件/勝手にやらないこと/出力形式が書かれているか
総合AI開発準備スコア … 上記7項目の重み付き平均
```

スコアは「存在するか(準備)」と「中身が十分か(品質)」を別々に評価する、ルールベースのチェックリスト方式です。
各カテゴリは複数のチェック項目(各1点)で構成され、`score = 満たした項目の重み合計 / 全項目の重み合計 × 100` で算出します。
ロジックは [src/scoring/rules.ts](src/scoring/rules.ts) に一元化されており、チェック内容・減点理由・改善案がルールごとに紐付いています。

詳細レポートでは、各カテゴリごとに **スコア / 減点理由 / 改善案** が出力されるほか、レポート全体として以下も出力されます。

- 次回必要なドキュメント
- AIに任せる前に足りなかった情報
- 人間が確認すべきポイント
- リスク

## 小規模/大規模判定仕様

変更規模の判定ロジックは [src/scoring/sizeClassifier.ts](src/scoring/sizeClassifier.ts) にあります。

以下のいずれか1つでも該当すれば **詳細レポート**、それ以外は **軽量レポート** になります。

- 変更ファイル数が8件を超える
- 追加行数が150行を超える
- DB変更が含まれる(`migrations/`, `schema`, `.sql` など)
- API変更が含まれる(`api/`, `routes/`, `controllers/` など)
- 認証/権限まわりの変更が含まれる(`auth/`, `permission/`, `role/` など)
- 決済/通知/外部API連携の変更が含まれる(`payment/`, `billing/`, `webhook/` など)
- 複数レイヤー(フロント/バック/DB など)にまたがる変更がある
- 変更規模が大きいにもかかわらずテストファイルの追加がない

軽量レポートでは「変更概要 / リスク / テスト有無 / 人間の確認ポイント / 詳細分析をスキップした理由」のみを出力し、
スコアの詳細分析は行いません(小さい変更で邪魔にならないようにするため)。

## 実行方法

```bash
# 1. ビルド
npm run build

# 2. mainブランチとの差分を分析してレポートを生成
ai-dev-doctor report --since main

# 3. 生成されたレポートを確認
open reports/ai-dev-report-*.html   # macOSの場合
```

開発中に直接実行する場合:

```bash
npm run dev -- report --since main
```

## テスト

```bash
npm test
```

`src/analyzers/fileClassifier.ts`(ファイル分類)、`src/scoring/sizeClassifier.ts`(軽量/詳細判定)、
`src/scoring/scorer.ts`(スコアリングエンジン)に対するユニットテストがあります。

## アーキテクチャ

```text
src/
  git/gitDiffCollector.ts     git diff統計の収集 (simple-git)
  analyzers/
    fileClassifier.ts         変更ファイルをtest/db/api/docs/レイヤーに分類
    docsScanner.ts            docs/配下のドキュメントをカテゴリ別に読み込み
  scoring/
    context.ts                スコアリング対象データの集約
    rules.ts                  チェック項目の定義(減点理由・改善案を含む、データ駆動)
    scorer.ts                 ルールを集計してスコアを算出する汎用エンジン
    sizeClassifier.ts         軽量/詳細レポートの判定ロジック
  report/
    buildReportData.ts        レポート用データモデルの組み立て
    markdownRenderer.ts / jsonRenderer.ts / htmlRenderer.ts  各形式への出力
    writeReports.ts           reports/ への書き出し
  templates/report.hbs        HTMLレポートのHandlebarsテンプレート
  cli.ts                      commanderによるCLIエントリポイント
```

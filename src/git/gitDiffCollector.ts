import simpleGit, { SimpleGit } from "simple-git";
import { ChangedFile, DiffSummary } from "../types";

export interface GitDiffCollectorOptions {
  cwd?: string;
  baseRef: string;
}

/**
 * git diff <baseRef>...HEAD の差分統計を収集する。
 * baseRef との共通祖先(merge-base)からの差分を見るため `...` を使う。
 */
export class GitDiffCollector {
  private git: SimpleGit;
  private baseRef: string;

  constructor(options: GitDiffCollectorOptions) {
    this.git = simpleGit(options.cwd ?? process.cwd());
    this.baseRef = options.baseRef;
  }

  async collect(): Promise<DiffSummary> {
    await this.assertGitRepo();
    const range = await this.resolveRange();

    const nameStatusOutput = await this.git.raw([
      "diff",
      "--name-status",
      range,
    ]);
    const numstatOutput = await this.git.raw(["diff", "--numstat", range]);

    const statusByPath = parseNameStatus(nameStatusOutput);
    const files = parseNumstat(numstatOutput, statusByPath);

    const totalInsertions = files.reduce((sum, f) => sum + f.insertions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return {
      baseRef: this.baseRef,
      files,
      totalInsertions,
      totalDeletions,
      totalFilesChanged: files.length,
    };
  }

  /** 作業ツリーの未コミット変更も含めるため、merge-base からワーキングツリーまでの範囲を解決する */
  private async resolveRange(): Promise<string> {
    try {
      const mergeBase = (
        await this.git.raw(["merge-base", this.baseRef, "HEAD"])
      ).trim();
      return mergeBase;
    } catch {
      // merge-base が解決できない場合は baseRef 自体を比較対象にする
      return this.baseRef;
    }
  }

  private async assertGitRepo(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      throw new Error(
        "Gitリポジトリではないディレクトリで実行されました。Gitリポジトリのルートで実行してください。"
      );
    }
  }
}

function parseNameStatus(output: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = output.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const parts = line.split("\t");
    const status = parts[0];
    // rename の場合 R100\told\tnew のような形式になる
    const path = parts[parts.length - 1];
    map.set(path, status.charAt(0));
  }
  return map;
}

function parseNumstat(
  output: string,
  statusByPath: Map<string, string>
): ChangedFile[] {
  const lines = output.split("\n").filter((l) => l.trim().length > 0);
  const files: ChangedFile[] = [];
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const [insertionsRaw, deletionsRaw, ...pathParts] = parts;
    const path = pathParts.join("\t");
    // バイナリファイルは "-" で表現される
    const insertions = insertionsRaw === "-" ? 0 : parseInt(insertionsRaw, 10);
    const deletions = deletionsRaw === "-" ? 0 : parseInt(deletionsRaw, 10);
    files.push({
      path,
      status: statusByPath.get(path) ?? "M",
      insertions: Number.isNaN(insertions) ? 0 : insertions,
      deletions: Number.isNaN(deletions) ? 0 : deletions,
    });
  }
  return files;
}

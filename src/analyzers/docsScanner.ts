import { promises as fs, Dirent } from "fs";
import path from "path";
import { DocCategory, DocFile, ChangedFile } from "../types";

interface CategoryPattern {
  category: DocCategory;
  pattern: RegExp;
}

// docs/ 配下 (またはリポジトリ直下) のファイル名からカテゴリを推定する
const CATEGORY_PATTERNS: CategoryPattern[] = [
  { category: "requirements", pattern: /requirement/i },
  { category: "design", pattern: /design/i },
  { category: "api", pattern: /api/i },
  { category: "database", pattern: /(database|db|schema)/i },
  { category: "sequence", pattern: /sequence/i },
  { category: "test", pattern: /test/i },
  {
    category: "aiInstructions",
    pattern: /(ai[-_]?instructions?|claude|prompt|ai[-_]?guideline)/i,
  },
];

const DOC_SEARCH_DIRS = ["docs", "doc", "."];
const AI_INSTRUCTION_EXTRA_FILES = ["CLAUDE.md", ".claude/instructions.md"];

export interface DocsScannerOptions {
  cwd?: string;
  changedFiles: ChangedFile[];
}

/**
 * リポジトリ内の docs/ 配下 (および直下の CLAUDE.md 等) を走査し、
 * カテゴリ別のドキュメントファイルを収集する。
 * 1カテゴリにつき最初に見つかった1ファイルを採用する。
 */
export async function scanDocs(options: DocsScannerOptions): Promise<DocFile[]> {
  const cwd = options.cwd ?? process.cwd();
  const changedPaths = new Set(options.changedFiles.map((f) => f.path));
  const found: Map<DocCategory, DocFile> = new Map();

  const candidateFiles = await collectCandidateFiles(cwd);

  for (const relPath of candidateFiles) {
    const basename = path.basename(relPath);
    const category = matchCategory(relPath, basename);
    if (!category) continue;
    if (found.has(category)) continue;

    const absPath = path.join(cwd, relPath);
    let content = "";
    try {
      content = await fs.readFile(absPath, "utf-8");
    } catch {
      continue;
    }

    found.set(category, {
      category,
      path: relPath,
      content,
      changedInDiff: changedPaths.has(relPath),
    });
  }

  return Array.from(found.values());
}

function matchCategory(relPath: string, basename: string): DocCategory | null {
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(basename) || pattern.test(relPath)) {
      return category;
    }
  }
  return null;
}

async function collectCandidateFiles(cwd: string): Promise<string[]> {
  const results: string[] = [];

  for (const dir of DOC_SEARCH_DIRS) {
    const absDir = path.join(cwd, dir);
    const entries = await safeReadDir(absDir);
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith(".md")) continue;
      const relPath = dir === "." ? entry.name : path.join(dir, entry.name);
      results.push(relPath.split(path.sep).join("/"));
    }
  }

  for (const extra of AI_INSTRUCTION_EXTRA_FILES) {
    const absPath = path.join(cwd, extra);
    if (await fileExists(absPath)) {
      results.push(extra);
    }
  }

  return results;
}

async function safeReadDir(dir: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

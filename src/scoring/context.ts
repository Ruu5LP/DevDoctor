import { DocCategory, DocFile, FileClassification, DiffSummary } from "../types";

/** スコアリングルールが参照する評価対象データ一式 */
export interface ScoringContext {
  docs: Map<DocCategory, DocFile>;
  classification: FileClassification;
  diff: DiffSummary;
}

export function buildScoringContext(
  docFiles: DocFile[],
  classification: FileClassification,
  diff: DiffSummary
): ScoringContext {
  const docs = new Map<DocCategory, DocFile>();
  for (const doc of docFiles) {
    docs.set(doc.category, doc);
  }
  return { docs, classification, diff };
}

export function docContent(ctx: ScoringContext, category: DocCategory): string {
  return ctx.docs.get(category)?.content ?? "";
}

export function hasDoc(ctx: ScoringContext, category: DocCategory): boolean {
  const doc = ctx.docs.get(category);
  return !!doc && doc.content.trim().length > 0;
}

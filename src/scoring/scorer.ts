import { CategoryScore, OverallScore, RuleResult, ScoreCategoryId } from "../types";
import { ScoringContext } from "./context";
import { ALL_RULES, CATEGORY_LABELS, OVERALL_WEIGHTS, ScoringRule } from "./rules";

function scoreCategory(
  categoryId: ScoreCategoryId,
  rules: ScoringRule[],
  ctx: ScoringContext
): CategoryScore {
  const ruleResults: RuleResult[] = rules.map((rule) => {
    const passed = rule.check(ctx);
    return {
      id: rule.id,
      label: rule.label,
      passed,
      weight: rule.weight,
      deductionReason: passed ? undefined : rule.deductionReason,
      improvement: passed ? undefined : rule.improvement,
    };
  });

  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const earnedWeight = ruleResults
    .filter((r) => r.passed)
    .reduce((sum, r) => sum + r.weight, 0);

  const score = totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100);

  return {
    id: categoryId,
    label: CATEGORY_LABELS[categoryId],
    score,
    maxScore: 100,
    ruleResults,
    deductionReasons: ruleResults
      .filter((r) => !r.passed && r.deductionReason)
      .map((r) => r.deductionReason as string),
    improvements: ruleResults
      .filter((r) => !r.passed && r.improvement)
      .map((r) => r.improvement as string),
  };
}

export function computeOverallScore(ctx: ScoringContext): OverallScore {
  const categoryIds = Object.keys(CATEGORY_LABELS) as ScoreCategoryId[];

  const categories = categoryIds.map((categoryId) => {
    const rules = ALL_RULES.filter((r) => r.category === categoryId);
    return scoreCategory(categoryId, rules, ctx);
  });

  const totalWeight = categories.reduce((sum, c) => sum + OVERALL_WEIGHTS[c.id], 0);
  const weightedSum = categories.reduce(
    (sum, c) => sum + c.score * OVERALL_WEIGHTS[c.id],
    0
  );
  const score = totalWeight === 0 ? 0 : Math.round(weightedSum / totalWeight);

  return { score, categories };
}

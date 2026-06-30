import { describe, it, expect } from "vitest";
import { classifyChangedFiles, hasAuthRelatedChange, hasPaymentOrExternalChange, detectLayers } from "../src/analyzers/fileClassifier";
import { ChangedFile } from "../src/types";

function file(path: string): ChangedFile {
  return { path, status: "M", insertions: 10, deletions: 2 };
}

describe("classifyChangedFiles", () => {
  it("classifies test, db, api, doc files", () => {
    const files = [
      file("src/components/Button.test.tsx"),
      file("migrations/202401_add_users.sql"),
      file("src/api/users.ts"),
      file("docs/requirements.md"),
      file("src/utils/helpers.ts"),
    ];
    const result = classifyChangedFiles(files);
    expect(result.testFiles.map((f) => f.path)).toContain("src/components/Button.test.tsx");
    expect(result.dbFiles.map((f) => f.path)).toContain("migrations/202401_add_users.sql");
    expect(result.apiFiles.map((f) => f.path)).toContain("src/api/users.ts");
    expect(result.docFiles.map((f) => f.path)).toContain("docs/requirements.md");
    expect(result.testFiles).toHaveLength(1);
  });

  it("does not misclassify unrelated files", () => {
    const files = [file("src/utils/helpers.ts")];
    const result = classifyChangedFiles(files);
    expect(result.testFiles).toHaveLength(0);
    expect(result.dbFiles).toHaveLength(0);
    expect(result.apiFiles).toHaveLength(0);
    expect(result.docFiles).toHaveLength(0);
  });
});

describe("hasAuthRelatedChange", () => {
  it("detects auth-related paths", () => {
    expect(hasAuthRelatedChange([file("src/auth/login.ts")])).toBe(true);
    expect(hasAuthRelatedChange([file("src/utils/helpers.ts")])).toBe(false);
  });
});

describe("hasPaymentOrExternalChange", () => {
  it("detects payment-related paths", () => {
    expect(hasPaymentOrExternalChange([file("src/payment/checkout.ts")])).toBe(true);
    expect(hasPaymentOrExternalChange([file("src/utils/helpers.ts")])).toBe(false);
  });
});

describe("detectLayers", () => {
  it("detects multiple layers", () => {
    const layers = detectLayers([
      file("src/api/users.ts"),
      file("src/components/Button.tsx"),
      file("migrations/add_users.sql"),
    ]);
    expect(layers.has("backend")).toBe(true);
    expect(layers.has("frontend")).toBe(true);
    expect(layers.has("database")).toBe(true);
  });
});

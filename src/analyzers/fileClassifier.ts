import { ChangedFile, FileClassification } from "../types";

const TEST_PATTERN = /(^|\/)(__tests__\/|tests?\/|specs?\/)|(\.|_)(test|spec)s?\.[a-zA-Z]+$/i;

const DB_PATTERN =
  /(^|\/)(migrations?|schema)(\/|\.)|\.sql$|prisma\/schema\.prisma|(^|\/)database\.|knexfile|sequelize/i;

const API_PATTERN =
  /(^|\/)(api|routes?|controllers?|endpoints?)(\/|\.)|openapi|swagger/i;

const DOC_PATTERN = /(^|\/)docs?\/.*\.md$/i;

export function classifyChangedFiles(files: ChangedFile[]): FileClassification {
  const testFiles: ChangedFile[] = [];
  const dbFiles: ChangedFile[] = [];
  const apiFiles: ChangedFile[] = [];
  const docFiles: ChangedFile[] = [];

  for (const file of files) {
    if (TEST_PATTERN.test(file.path)) testFiles.push(file);
    if (DB_PATTERN.test(file.path)) dbFiles.push(file);
    if (API_PATTERN.test(file.path)) apiFiles.push(file);
    if (DOC_PATTERN.test(file.path)) docFiles.push(file);
  }

  return { testFiles, dbFiles, apiFiles, docFiles };
}

const AUTH_PATTERN = /(^|\/)(auth|permission|role|acl|session)(\/|\.|s\/|s\.)/i;
const PAYMENT_NOTIFICATION_PATTERN =
  /(^|\/)(payment|billing|invoice|notif|webhook|external)(\/|\.|s\/|s\.)|stripe|paypal/i;

export function hasAuthRelatedChange(files: ChangedFile[]): boolean {
  return files.some((f) => AUTH_PATTERN.test(f.path));
}

export function hasPaymentOrExternalChange(files: ChangedFile[]): boolean {
  return files.some((f) => PAYMENT_NOTIFICATION_PATTERN.test(f.path));
}

/** 変更ファイルパスから、ざっくりとしたレイヤー(層)を推定する */
export type Layer = "frontend" | "backend" | "database" | "test" | "docs" | "infra" | "other";

const LAYER_PATTERNS: Array<[Layer, RegExp]> = [
  ["database", DB_PATTERN],
  ["test", TEST_PATTERN],
  ["docs", DOC_PATTERN],
  ["infra", /(^|\/)(\.github|docker|infra|terraform|k8s)(\/|\.)/i],
  [
    "frontend",
    /(^|\/)(src\/)?(components?|pages?|views?|ui)\/|\.(tsx|jsx|vue|svelte|css|scss)$/i,
  ],
  ["backend", API_PATTERN],
];

export function detectLayers(files: ChangedFile[]): Set<Layer> {
  const layers = new Set<Layer>();
  for (const file of files) {
    let matched: Layer = "other";
    for (const [layer, pattern] of LAYER_PATTERNS) {
      if (pattern.test(file.path)) {
        matched = layer;
        break;
      }
    }
    layers.add(matched);
  }
  return layers;
}

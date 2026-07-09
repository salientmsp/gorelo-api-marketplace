/**
 * Matrix generator. Reads the capability manifest and emits:
 *   - FEATURE-MATRIX.md   (human)
 *   - feature-matrix.json (machine)
 *
 * These are DERIVED artifacts — never hand-edit them. Run `npm run matrix` to
 * regenerate. Run `npm run matrix:check` (CI) to fail the build when the files
 * are stale OR the manifest disagrees with the GoreloBackend implementation.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { manifestEntries } from "../src/manifest/manifest.js";
import { coverageSummary } from "../src/manifest/index.js";
import type { ManifestEntry } from "../src/manifest/types.js";
import { manifestImplementationDrift } from "../src/backends/gorelo/gorelo-backend.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const MD_PATH = join(root, "FEATURE-MATRIX.md");
const JSON_PATH = join(root, "feature-matrix.json");

const STATUS_BADGE: Record<string, string> = {
  full: "✅ full",
  partial: "🟡 partial",
  missing: "❌ missing",
  planned: "🔵 planned",
};

function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function renderRow(e: ManifestEntry): string {
  const ref = e.goreloRef ? e.goreloRef.map((r) => `\`${r}\``).join("<br>") : "—";
  const unsupported = e.unsupportedParams.length ? e.unsupportedParams.map((p) => `\`${p}\``).join(", ") : "—";
  const caveats = e.caveats.length ? e.caveats.map(cell).join(" ") : "—";
  return `| \`${e.resource}\` | \`${e.operation}\` | ${STATUS_BADGE[e.status] ?? e.status} | ${ref} | ${cell(unsupported)} | ${cell(caveats)} |`;
}

function renderFieldMap(e: ManifestEntry): string {
  if (e.fieldMap.length === 0) return "";
  const rows = e.fieldMap
    .map((f) => {
      const g = f.gorelo ? `\`${f.gorelo}\`` : "_(no source)_";
      return `| \`${f.halo}\` | ${g} | ${f.direction} | ${f.transform ? cell(f.transform) : "—"} |`;
    })
    .join("\n");
  return (
    `\n<details><summary><code>${e.resource}.${e.operation}</code> field map</summary>\n\n` +
    `| Halo | Gorelo | Dir | Transform |\n|---|---|---|---|\n` +
    rows +
    `\n\n</details>\n`
  );
}

function generateMarkdown(): string {
  const cov = coverageSummary();
  const header = `# Gorelo Feature Matrix

> **Generated file — do not edit.** Produced from the typed capability manifest
> (\`src/manifest/manifest.ts\`) by \`scripts/generate-matrix.ts\`. Run
> \`npm run matrix\` to regenerate; \`npm run matrix:check\` gates CI.

Coverage of the **Gorelo** backend against the Halo-shaped public contract. The
Halo backend is a faithful passthrough (every operation \`full\`), so only Gorelo
needs a matrix.

## Coverage summary

- **${cov.supported}/${cov.total}** operations servable (${cov.supportedPct}%)
- ✅ full: ${cov.byStatus.full} · 🟡 partial: ${cov.byStatus.partial} · ❌ missing: ${cov.byStatus.missing} · 🔵 planned: ${cov.byStatus.planned}

## Operations

| Resource | Operation | Status | Gorelo endpoint | Unsupported params | Caveats |
|---|---|---|---|---|---|
`;

  const rows = manifestEntries.map(renderRow).join("\n");

  const fieldMaps = manifestEntries
    .filter((e) => e.fieldMap.length > 0)
    .map(renderFieldMap)
    .join("");

  return `${header}${rows}\n\n## Field maps\n${fieldMaps}\n`;
}

function generateJson(): string {
  const cov = coverageSummary();
  return (
    JSON.stringify(
      {
        generatedFrom: "src/manifest/manifest.ts",
        provider: "gorelo",
        coverage: cov,
        operations: manifestEntries,
      },
      null,
      2,
    ) + "\n"
  );
}

function readIf(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function main(): void {
  const check = process.argv.includes("--check");
  const md = generateMarkdown();
  const json = generateJson();

  const problems: string[] = [];

  // Anti-drift #1: manifest vs implementation.
  const drift = manifestImplementationDrift();
  if (drift.implementedButNotSupported.length) {
    problems.push(
      `GoreloBackend implements ops the manifest marks unsupported: ${drift.implementedButNotSupported.join(", ")}`,
    );
  }
  if (drift.supportedButNotImplemented.length) {
    problems.push(
      `Manifest marks ops full/partial that GoreloBackend does not implement: ${drift.supportedButNotImplemented.join(", ")}`,
    );
  }

  if (check) {
    // Anti-drift #2: generated files must be up to date.
    if (readIf(MD_PATH) !== md) problems.push("FEATURE-MATRIX.md is stale. Run `npm run matrix`.");
    if (readIf(JSON_PATH) !== json) problems.push("feature-matrix.json is stale. Run `npm run matrix`.");

    if (problems.length) {
      console.error("Matrix check FAILED:\n - " + problems.join("\n - "));
      process.exit(1);
    }
    console.log("Matrix check passed: manifest, implementation, and generated files agree.");
    return;
  }

  if (problems.length) {
    console.error("Refusing to generate: manifest/implementation drift:\n - " + problems.join("\n - "));
    process.exit(1);
  }

  writeFileSync(MD_PATH, md);
  writeFileSync(JSON_PATH, json);
  const cov = coverageSummary();
  console.log(`Wrote FEATURE-MATRIX.md and feature-matrix.json (${cov.supported}/${cov.total} ops supported).`);
}

main();

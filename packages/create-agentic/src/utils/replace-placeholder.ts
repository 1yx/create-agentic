import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "pathe";

const PLACEHOLDER_RE = /\{\{([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g;

const SKIP_DIRS = new Set(["node_modules", ".git", ".obsidian"]);
const SKIP_FILES = new Set([
  "AGENTS.md",
  "CHANGELOG.md",
  "eslint.config.mjs",
  "eslint.config.js",
  "esbuild.config.mjs",
  "esbuild.config.js",
]);

function isScannableFile(name: string): boolean {
  return /\.(json|ts|js|mjs|mts|cts|cjs|md|css|yaml|yml|html|txt)$/i.test(name);
}

/**
 * Scan all text files under targetDir for {{placeholder}} patterns.
 * Returns a deduplicated Set of placeholder names.
 */
export function scanPlaceholders(targetDir: string): Set<string> {
  const placeholders = new Set<string>();

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (SKIP_FILES.has(entry)) continue;

      const fullPath = join(dir, entry);
      let stat: ReturnType<typeof statSync>;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (SKIP_DIRS.has(entry)) continue;
        walk(fullPath);
        continue;
      }

      if (!stat.isFile()) continue;
      if (!isScannableFile(entry)) continue;

      try {
        const content = readFileSync(fullPath, "utf-8");
        for (const match of content.matchAll(PLACEHOLDER_RE)) {
          placeholders.add(match[1]);
        }
      } catch {
        // Skip files that can't be read as text
      }
    }
  }

  walk(targetDir);
  return placeholders;
}

/**
 * Replace all {{placeholder}} occurrences with the provided values.
 * Processes all text files recursively under targetDir.
 */
export function replacePlaceholders(
  targetDir: string,
  values: Record<string, string>,
): void {
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (SKIP_FILES.has(entry)) continue;

      const fullPath = join(dir, entry);
      let stat: ReturnType<typeof statSync>;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (SKIP_DIRS.has(entry)) continue;
        walk(fullPath);
        continue;
      }

      if (!stat.isFile()) continue;
      if (!isScannableFile(entry)) continue;

      try {
        const content = readFileSync(fullPath, "utf-8");
        let updated = content;
        for (const [key, value] of Object.entries(values)) {
          updated = updated.replaceAll(`{{${key}}}`, value);
        }
        if (updated !== content) {
          writeFileSync(fullPath, updated);
        }
      } catch {
        // Skip
      }
    }
  }

  walk(targetDir);
}

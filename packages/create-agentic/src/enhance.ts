import { readFileSync, writeFileSync } from "node:fs";
import { join } from "pathe";
import type { Manifest } from "./manifest.js";
import type { CollisionAction } from "./plan.js";
import { collectRelativeFiles, globToRegex } from "./plan.js";

export class EnhanceError extends Error {}

export interface EnhancementChoice {
  option: string;
  onCollision?: CollisionAction;
}

const ALLOWED_ACTIONS: Record<string, CollisionAction[]> = {
  structured: ["keep", "replace"],
  "markdown-appendable": ["keep", "append"],
};

/** Visible separator placed between upstream content and an appended block. */
const APPEND_SEPARATOR = "\n\n---\n\n";

const AGENTS_MD_AGENTIC = `# AGENTS.md

Guidance for AI coding agents working in this repository. Replace the package
manager and script names below with this project's actual tooling.

## Commands

- Install: \`pnpm install\`
- Build: \`pnpm build\`
- Lint: \`pnpm lint\`
- Typecheck: \`pnpm typecheck\`
- Test: \`pnpm test\`

## Conventions

- Prefer the standard library and existing helpers over new dependencies.
- Keep changes minimal and focused; one concern per change.
- Run lint and typecheck before declaring work done.

## Specs / change tracking

If this project uses OpenSpec, proposed work lives under \`openspec/changes/\`
and archived specs under \`openspec/specs/\`. Prefer implementing via tracked
changes.
`;

interface Asset {
  content: string;
  /** Concrete filename to write when there is no collision (additive). */
  writeName: string;
}

/** Resolve content + write filename for a file-writing enhancement option. */
function getOptionAsset(
  category: string,
  option: string,
  templateDir: string,
): Asset {
  if (category === "eslint" && option === "agentic-baseline") {
    // Each template ships its own ESLint baseline adapted to its dependencies
    // (obsidian-plugin uses the `typescript-eslint` meta-package + obsidianmd;
    // the typescript template uses the parser/plugin sub-packages). Use the
    // chosen template's own config so a replace never drops incompatible imports.
    return {
      content: readFileSync(join(templateDir, "eslint.config.mjs"), "utf-8"),
      writeName: "eslint.config.mjs",
    };
  }
  if (category === "agents-md" && option === "agentic") {
    return { content: AGENTS_MD_AGENTIC, writeName: "AGENTS.md" };
  }
  throw new EnhanceError(
    `No content asset for enhancement ${category}.${option}.`,
  );
}

/**
 * Apply chosen enhancements to an already-scaffolded tree with the L2 collision
 * model: default upstream-wins; structured → keep|replace; markdown-appendable
 * → keep|append. Throws without modifying the tree if any onCollision is not
 * permitted for its option's collisionKind.
 */
export function applyEnhancements(
  targetDir: string,
  enhancements: Record<string, EnhancementChoice>,
  manifest: Manifest,
  templateDir: string,
): void {
  const categoryByName = new Map(manifest.categories.map((c) => [c.name, c]));

  const resolved = Object.entries(enhancements).map(([category, choice]) => {
    const opt = categoryByName
      .get(category)
      ?.options.find((o) => o.id === choice.option);
    if (!opt) {
      throw new EnhanceError(`Unknown enhancement ${category}.${choice.option}.`);
    }
    return { category, choice, opt };
  });

  // Pass 1: validate every onCollision against its collisionKind before writing
  // anything, so a disallowed policy leaves the tree unchanged.
  for (const { category, choice, opt } of resolved) {
    if (choice.onCollision && !opt.collisionKind) {
      throw new EnhanceError(
        `Option ${category}.${choice.option} writes no files and does not support onCollision.`,
      );
    }
    if (choice.onCollision && opt.collisionKind) {
      const allowed = ALLOWED_ACTIONS[opt.collisionKind];
      if (!allowed.includes(choice.onCollision)) {
        throw new EnhanceError(
          `onCollision "${choice.onCollision}" is not permitted for ${category}.${choice.option} (${opt.collisionKind} allows ${allowed.join("|")}).`,
        );
      }
    }
  }

  // Pass 2: apply. The tree is re-read per option so each step sees prior writes.
  for (const { category, choice, opt } of resolved) {
    if (!opt.footprint) continue; // non-writing option (none / keep-upstream)
    const { content, writeName } = getOptionAsset(
      category,
      choice.option,
      templateDir,
    );
    const files = collectRelativeFiles(targetDir);

    const matched: string[] = [];
    for (const glob of opt.footprint) {
      const re = globToRegex(glob);
      for (const f of files) {
        if (re.test(f) && !matched.includes(f)) matched.push(f);
      }
    }

    if (matched.length === 0) {
      writeFileSync(join(targetDir, writeName), content);
      continue;
    }

    const action: CollisionAction = choice.onCollision ?? "keep";
    for (const f of matched) {
      if (action === "keep") continue;
      const full = join(targetDir, f);
      if (action === "replace") {
        writeFileSync(full, content);
      } else {
        const existing = readFileSync(full, "utf-8");
        writeFileSync(
          full,
          `${existing.replace(/\s+$/, "")}${APPEND_SEPARATOR}${content.trim()}\n`,
        );
      }
    }
  }
}

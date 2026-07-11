import { basename, resolve } from "node:path";
import { readdirSync, readFileSync, statSync } from "node:fs";
import process from "node:process";
import { join } from "pathe";
import type { Manifest, CollisionKind } from "./manifest.js";
import { scanPlaceholders } from "./utils/replace-placeholder.js";

export type CollisionAction = "keep" | "replace" | "append";

/** Raw plan as authored by the agent (plan.json). */
export interface PlanInput {
  driver?: string;
  target?: string;
  force?: boolean;
  template: string;
  placeholders?: Record<string, string>;
  enhancements?: Record<string, { option: string; onCollision?: CollisionAction }>;
  post?: { install?: boolean; git?: boolean };
}

/** Fully resolved, validated plan. `project-name` is always present in placeholders. */
export interface ResolvedPlan {
  driver: string;
  target: string;
  force: boolean;
  template: string;
  projectName: string;
  placeholders: Record<string, string>;
  enhancements: Record<string, { option: string; onCollision?: CollisionAction }>;
  post: { install: boolean; git: boolean };
}

export interface PredictedCollision {
  category: string;
  option: string;
  footprint: string;
  file: string;
}

/** Errors thrown while resolving/validating a plan. The CLI prints these cleanly. */
export class PlanError extends Error {}

const ALLOWED_ACTIONS: Record<CollisionKind, CollisionAction[]> = {
  structured: ["keep", "replace"],
  "markdown-appendable": ["keep", "append"],
};

/**
 * Resolve a raw plan into a fully-specified one. Does not validate against a
 * manifest (see `validatePlan`). `positionalDir`, when given, overrides
 * `plan.target` (CLI positional `[dir]` wins).
 */
export function resolvePlan(
  input: PlanInput,
  opts: { positionalDir?: string; cwd: string },
): ResolvedPlan {
  const driver = input.driver ?? process.env.CREATE_AGENTIC_DRIVER;
  if (!driver) {
    throw new PlanError(
      "No driver: set `driver` in the plan or the CREATE_AGENTIC_DRIVER env var.",
    );
  }

  const targetRaw = opts.positionalDir || input.target;
  if (!targetRaw) {
    throw new PlanError(
      "No target: provide a positional [dir] or `target` in the plan.",
    );
  }
  const target = resolve(opts.cwd, targetRaw);
  const projectName = basename(target);

  return {
    driver,
    target,
    force: input.force ?? false,
    template: input.template,
    projectName,
    placeholders: {
      "project-name": projectName,
      ...(input.placeholders ?? {}),
    },
    enhancements: input.enhancements ?? {},
    post: {
      install: input.post?.install ?? true,
      git: input.post?.git ?? true,
    },
  };
}

/**
 * Validate a resolved plan against the manifest and the chosen template:
 * template exists; every non-`project-name` placeholder the template uses is
 * provided; each enhancement option exists; `onCollision` (if given) is
 * permitted for the option's collisionKind.
 */
export function validatePlan(
  plan: ResolvedPlan,
  manifest: Manifest,
  templatesDir: string,
): void {
  const templateNames = new Set(manifest.templates.map((t) => t.name));
  if (!templateNames.has(plan.template)) {
    throw new PlanError(
      `Unknown template "${plan.template}". Available: ${[...templateNames].sort().join(", ")}.`,
    );
  }

  // Placeholder completeness — reuses the scaffold's own scanner (which already
  // skips eslint.config.* etc., so the {{name}}/{{suggested}} rule-message
  // false positives never appear).
  const templateDir = join(templatesDir, plan.template);
  const used = scanPlaceholders(templateDir);
  used.delete("project-name");
  const provided = new Set(Object.keys(plan.placeholders));
  for (const key of [...used].sort()) {
    if (!provided.has(key)) {
      throw new PlanError(
        `Missing placeholder: template "${plan.template}" requires {{${key}}} but it is absent from plan.placeholders.`,
      );
    }
  }

  // Enhancements
  const categoryByName = new Map(manifest.categories.map((c) => [c.name, c]));
  for (const [category, choice] of Object.entries(plan.enhancements)) {
    const cat = categoryByName.get(category);
    if (!cat) {
      throw new PlanError(
        `Unknown enhancement category "${category}". Available: ${[...categoryByName.keys()].join(", ")}.`,
      );
    }
    const opt = cat.options.find((o) => o.id === choice.option);
    if (!opt) {
      throw new PlanError(
        `Unknown option "${choice.option}" for category "${category}". Available: ${cat.options.map((o) => o.id).join(", ")}.`,
      );
    }
    if (choice.onCollision) {
      if (!opt.collisionKind) {
        throw new PlanError(
          `Option "${category}.${choice.option}" writes no files and does not support onCollision.`,
        );
      }
      const allowed = ALLOWED_ACTIONS[opt.collisionKind];
      if (!allowed.includes(choice.onCollision)) {
        throw new PlanError(
          `onCollision "${choice.onCollision}" is not permitted for "${category}.${choice.option}" (${opt.collisionKind} allows ${allowed.join("|")}).`,
        );
      }
    }
  }
}

/**
 * Predict collisions: for each chosen enhancement option that declares a
 * footprint, find bundled-template files matching each footprint glob.
 * Read-only — performs no writes.
 */
export function predictCollisions(
  plan: ResolvedPlan,
  manifest: Manifest,
  templatesDir: string,
): PredictedCollision[] {
  const categoryByName = new Map(manifest.categories.map((c) => [c.name, c]));
  const templateDir = join(templatesDir, plan.template);
  const files = collectRelativeFiles(templateDir);

  const collisions: PredictedCollision[] = [];
  for (const [category, choice] of Object.entries(plan.enhancements)) {
    const opt = categoryByName.get(category)?.options.find(
      (o) => o.id === choice.option,
    );
    if (!opt?.footprint) continue;
    for (const glob of opt.footprint) {
      const re = globToRegex(glob);
      for (const file of files) {
        if (re.test(file)) {
          collisions.push({ category, option: choice.option, footprint: glob, file });
        }
      }
    }
  }
  return collisions.sort((a, b) =>
    `${a.category}/${a.file}`.localeCompare(`${b.category}/${b.file}`),
  );
}

const SKIP_DIRS = new Set(["node_modules", ".git"]);
export function collectRelativeFiles(dir: string, base = dir, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      collectRelativeFiles(full, base, acc);
    } else if (st.isFile()) {
      acc.push(full.slice(base.length + 1));
    }
  }
  return acc;
}

/**
 * Minimal glob → RegExp for footprint matching. Supports `*` (within a path
 * segment) and `?`; everything else is literal. No `**` cross-directory
 * support — V1 footprints are single-segment (e.g. `eslint.config.*`).
 */
export function globToRegex(glob: string): RegExp {
  let re = "^";
  for (const ch of glob) {
    if (ch === "*") re += "[^/]*";
    else if (ch === "?") re += "[^/]";
    else re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${re}$`);
}

/** Read and parse a plan.json file. Throws PlanError on IO/parse failure. */
export function loadPlanFile(configPath: string): PlanInput {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), configPath), "utf-8");
  } catch {
    throw new PlanError(`Cannot read config file: ${configPath}`);
  }
  try {
    return JSON.parse(raw) as PlanInput;
  } catch {
    throw new PlanError(`Invalid JSON in config file: ${configPath}`);
  }
}

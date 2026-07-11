import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";
import { join } from "pathe";
import { installDependencies } from "nypm";
import { x } from "tinyexec";
import type { Manifest } from "./manifest.js";
import type { ResolvedPlan } from "./plan.js";
import { collectRelativeFiles } from "./plan.js";
import { copyTemplate } from "./utils/copy-template.js";
import { replacePlaceholders } from "./utils/replace-placeholder.js";
import { applyEnhancements } from "./enhance.js";

export class PipelineError extends Error {}

export interface PostResult {
  ok: boolean;
  error?: string;
}

export interface PipelineResult {
  target: string;
  backupPath?: string;
  postResults: { install: PostResult; git: PostResult };
  diffSummary: string[];
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Execute a resolved plan atomically: scaffold (copy + placeholder replace) and
 * enhance run in a temp directory that is a sibling of the target (same
 * filesystem, so the final rename is atomic). On any failure during
 * scaffold/enhance the temp is discarded and the target is never created.
 * Post-steps (install, git) run best-effort after the move and never undo it.
 */
export async function executePipeline(
  plan: ResolvedPlan,
  manifest: Manifest,
  templatesDir: string,
): Promise<PipelineResult> {
  if (existsSync(plan.target) && !plan.force) {
    throw new PipelineError(
      `Target "${plan.target}" already exists. Set force: true to overwrite.`,
    );
  }

  const templateDir = join(templatesDir, plan.template);
  // Ensure the target's parent exists so nested targets (e.g. "apps/my-app")
  // work; the interactive path creates the target recursively via copyTemplate.
  mkdirSync(dirname(plan.target), { recursive: true });
  const tempDir = mkdtempSync(join(dirname(plan.target), ".ca-tmp-"));

  try {
    copyTemplate(templateDir, tempDir);
    replacePlaceholders(tempDir, plan.placeholders);
    applyEnhancements(tempDir, plan.enhancements, manifest, templateDir);
  } catch (err) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new PipelineError(
      `Scaffold failed, target untouched: ${err instanceof Error ? err.message : err}`,
    );
  }

  // Force backup + atomic swap.
  let backupPath: string | undefined;
  if (plan.force && existsSync(plan.target)) {
    backupPath = `${plan.target}.bak-${timestamp()}`;
    renameSync(plan.target, backupPath);
  }
  try {
    renameSync(tempDir, plan.target);
  } catch (err) {
    if (backupPath) renameSync(backupPath, plan.target);
    throw new PipelineError(
      `Atomic move failed: ${err instanceof Error ? err.message : err}`,
    );
  }

  const postResults = {
    install: await runInstallBestEffort(plan),
    git: await runGitBestEffort(plan),
  };

  return {
    target: plan.target,
    ...(backupPath ? { backupPath } : {}),
    postResults,
    diffSummary: collectRelativeFiles(plan.target),
  };
}

async function runInstallBestEffort(plan: ResolvedPlan): Promise<PostResult> {
  if (!plan.post.install) return { ok: true };
  try {
    await installDependencies({ cwd: plan.target, silent: true });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runGitBestEffort(plan: ResolvedPlan): Promise<PostResult> {
  if (!plan.post.git) return { ok: true };
  try {
    await x("git", ["init", plan.target], { throwOnError: true });
    await x("git", ["add", "."], {
      nodeOptions: { cwd: plan.target },
      throwOnError: true,
    });
    await x("git", ["commit", "-m", "Initial commit from create-agentic"], {
      nodeOptions: {
        cwd: plan.target,
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: "create-agentic",
          GIT_AUTHOR_EMAIL: "",
          GIT_COMMITTER_NAME: "create-agentic",
          GIT_COMMITTER_EMAIL: "",
        },
      },
      throwOnError: true,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

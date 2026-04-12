import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "pathe";

/**
 * Copy bundled template files to the target directory.
 * Excludes node_modules and .DS_Store.
 */
export function copyTemplate(templateDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src: string) => {
      return !src.includes("node_modules") && !src.includes(".DS_Store");
    },
  });

  // Remove lockfile if it exists (user will regenerate via install)
  rmSync(join(targetDir, "pnpm-lock.yaml"), { force: true });
}

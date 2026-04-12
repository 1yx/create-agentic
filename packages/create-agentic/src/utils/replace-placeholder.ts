import { readFileSync, writeFileSync } from "node:fs";
import { join } from "pathe";

/**
 * Replace {{project-name}} placeholder with the actual project name.
 * Only processes package.json and README.md.
 */
export function replacePlaceholder(
  targetDir: string,
  projectName: string,
): void {
  const files = ["package.json", "README.md"];
  for (const file of files) {
    const filePath = join(targetDir, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const updated = content.replaceAll("{{project-name}}", projectName);
      writeFileSync(filePath, updated);
    } catch {
      // File may not exist; skip
    }
  }
}

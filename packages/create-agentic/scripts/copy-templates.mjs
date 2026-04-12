import { cpSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesSrc = join(__dirname, "..", "..", "templates");
const templatesDest = join(__dirname, "..", "dist", "templates");

mkdirSync(templatesDest, { recursive: true });
cpSync(templatesSrc, templatesDest, {
  recursive: true,
  filter: (src) => !src.includes("node_modules") && !src.includes(".DS_Store"),
});

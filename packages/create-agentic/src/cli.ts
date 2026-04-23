import { existsSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";
import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import * as clack from "@clack/prompts";
import { join } from "pathe";
import { copyTemplate } from "./utils/copy-template.js";
import { scanPlaceholders, replacePlaceholders } from "./utils/replace-placeholder.js";
import { runPostScaffoldSteps } from "./utils/run-steps.js";

const TEMPLATES_DIR = join(import.meta.dirname, "templates");

const command = defineCommand({
  meta: {
    name: "create-agentic",
    version: "0.1.0",
    description: "Scaffold a new project with agentic best practices",
  },
  args: {
    dir: {
      type: "positional",
      description: "Project directory name or path",
      default: "",
    },
    template: {
      type: "string",
      alias: "t",
      default: "typescript",
      description: "Template to use (default: typescript)",
    },
    force: {
      type: "boolean",
      alias: "f",
      description: "Overwrite existing directory",
    },
    install: {
      type: "boolean",
      default: true,
      description: "Install dependencies after scaffolding",
    },
    git: {
      type: "boolean",
      default: true,
      description: "Initialize git repository",
    },
    openspec: {
      type: "boolean",
      default: true,
      description: "Run openspec init",
    },
  },
  async run(ctx) {
    let dir = ctx.args.dir as string;

    // Interactive prompt if no dir provided and TTY available
    if (!dir) {
      if (!process.stdout.isTTY) {
        consola.error("Please provide a directory name.");
        process.exit(1);
      }

      clack.intro("create-agentic");
      const result = await clack.text({
        message: "Where should we create your project?",
        placeholder: "./my-project",
        defaultValue: "my-project",
      });
      if (clack.isCancel(result)) {
        clack.cancel("Operation cancelled.");
        process.exit(1);
      }
      dir = result;
    }

    const cwd = resolve(process.cwd());
    const projectName = basename(resolve(cwd, dir));
    const targetDir = resolve(cwd, dir);

    // Check if directory exists
    if (existsSync(targetDir) && !ctx.args.force) {
      consola.error(
        `Directory "${dir}" already exists. Use --force to overwrite.`,
      );
      process.exit(1);
    }

    if (!process.stdout.isTTY) {
      consola.info(`Creating project in ${targetDir}`);
    } else {
      clack.intro("create-agentic");
    }

    // Copy template
    const templateName = ctx.args.template as string;
    const templateDir = join(TEMPLATES_DIR, templateName);
    if (!existsSync(templateDir)) {
      consola.error(`Template "${templateName}" not found.`);
      consola.info(
        `Available templates: ${readdirSync(TEMPLATES_DIR).join(", ")}`,
      );
      process.exit(1);
    }

    consola.start(`Copying ${templateName} template...`);
    copyTemplate(templateDir, targetDir);
    consola.success("Template copied.");

    // Scan and replace placeholders
    const placeholders = scanPlaceholders(targetDir);
    if (placeholders.size > 0) {
      const values: Record<string, string> = {};

      if (placeholders.has("project-name")) {
        values["project-name"] = projectName;
        placeholders.delete("project-name");
      }

      // Prompt for remaining placeholders
      if (placeholders.size > 0 && process.stdout.isTTY) {
        for (const key of placeholders) {
          const result = await clack.text({
            message: `Value for {{${key}}}?`,
            placeholder: key,
          });
          if (clack.isCancel(result)) {
            clack.cancel("Operation cancelled.");
            process.exit(1);
          }
          values[key] = result;
        }
      } else if (placeholders.size > 0) {
        consola.error(
          `Placeholders require input but no TTY detected: ${[...placeholders].map((k) => `{{${k}}}`).join(", ")}`,
        );
        process.exit(1);
      }

      replacePlaceholders(targetDir, values);
      consola.success("Placeholders replaced.");
    }

    // Post-scaffold steps
    await runPostScaffoldSteps({
      targetDir,
      install: ctx.args.install !== false,
      git: ctx.args.git !== false,
      openspec: ctx.args.openspec !== false,
    });

    // Show next steps
    if (process.stdout.isTTY) {
      clack.note(
        [
          `cd ${dir}`,
          "pnpm dev",
        ].join("\n"),
        "Next steps",
      );
      clack.outro("Project created!");
    } else {
      consola.box(
        [
          "Project created!",
          "",
          `  cd ${dir}`,
          "  pnpm dev",
        ].join("\n"),
      );
    }
  },
});

runMain(command);

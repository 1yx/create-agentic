import { installDependencies } from "nypm";
import { x } from "tinyexec";
import { consola } from "consola";

/**
 * Run post-scaffold steps: install deps, git init, openspec init.
 */
export async function runPostScaffoldSteps(options: {
  targetDir: string;
  install: boolean;
  git: boolean;
  openspec: boolean;
}): Promise<void> {
  if (options.install) {
    consola.start("Installing dependencies...");
    try {
      await installDependencies({ cwd: options.targetDir, silent: true });
      consola.success("Dependencies installed.");
    } catch (err) {
      consola.warn(`Failed to install dependencies: ${err}`);
    }
  }

  if (options.git) {
    consola.start("Initializing git repository...");
    try {
      await x("git", ["init", options.targetDir], { throwOnError: true });
      await x("git", ["add", "."], {
        cwd: options.targetDir,
        throwOnError: true,
      });
      await x(
        "git",
        ["commit", "-m", "Initial commit from create-agentic"],
        {
          cwd: options.targetDir,
          throwOnError: true,
          env: {
            GIT_AUTHOR_NAME: "create-agentic",
            GIT_AUTHOR_EMAIL: "",
            GIT_COMMITTER_NAME: "create-agentic",
            GIT_COMMITTER_EMAIL: "",
          },
        },
      );
      consola.success("Git repository initialized.");
    } catch (err) {
      consola.warn(`Failed to initialize git: ${err}`);
    }
  }

  if (options.openspec) {
    consola.start("Running openspec init...");
    try {
      await x("npx", ["openspec@latest", "init"], {
        cwd: options.targetDir,
        throwOnError: true,
        nodeOptions: { stdio: "inherit" },
      });
      consola.success("openspec initialized.");
    } catch {
      consola.warn(
        "openspec init failed. You can run it manually with: npx openspec@latest init",
      );
    }
  }
}

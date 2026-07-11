import { readdirSync, statSync } from "node:fs";
import { join } from "pathe";

/** Collision semantics for a file-writing enhancement option. */
export type CollisionKind = "structured" | "markdown-appendable";

export interface ManifestOption {
  id: string;
  /** Path globs (relative to project root) the option writes. Absent on non-writing options. */
  footprint?: string[];
  /** Present iff `footprint` is present. */
  collisionKind?: CollisionKind;
}

export interface ManifestCategory {
  name: string;
  options: ManifestOption[];
}

export interface ManifestTemplate {
  name: string;
  source: "bundled";
}

export interface Manifest {
  version: 1;
  driver: { known: string[] };
  templates: ManifestTemplate[];
  categories: ManifestCategory[];
}

/**
 * V1 enhancement categories. `spec-tracking` and `git` are deferred to M2
 * (see PRD.md milestone roadmap).
 */
const V1_CATEGORIES: ManifestCategory[] = [
  {
    name: "eslint",
    options: [
      { id: "none" },
      { id: "keep-upstream" },
      {
        id: "agentic-baseline",
        footprint: ["eslint.config.*"],
        collisionKind: "structured",
      },
    ],
  },
  {
    name: "agents-md",
    options: [
      { id: "none" },
      {
        id: "agentic",
        footprint: ["AGENTS.md"],
        collisionKind: "markdown-appendable",
      },
    ],
  },
];

/** Agent identities that may drive create-agentic (PRD.md decision 6b). */
const KNOWN_DRIVERS = ["pi", "claude", "cursor", "copilot"];

/**
 * Build the self-describing manifest. Templates are auto-discovered as
 * subdirectories of `templatesDir` (bundled with the CLI), matching the
 * discovery the scaffold path already uses.
 */
export function buildManifest(templatesDir: string): Manifest {
  const templates: ManifestTemplate[] = readdirSync(templatesDir)
    .filter((name) => {
      try {
        return statSync(join(templatesDir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((name) => ({ name, source: "bundled" as const }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    version: 1,
    driver: { known: KNOWN_DRIVERS },
    templates,
    categories: V1_CATEGORIES,
  };
}

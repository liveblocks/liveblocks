import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Skill } from "@/lib/skills";

/**
 * Loads skills from the `skills/` directory. Each skill is a folder named
 * after its id, containing a `SKILL.md` with YAML-style frontmatter and the
 * instructions as the body:
 *
 *     ---
 *     name: Fix bug
 *     description: Reproduce and fix a bug, with a regression test
 *     ---
 *
 *     Treat the message as a bug report. ...
 *
 * Drop a folder in and it shows up in the "/" menu; nothing to register.
 * Read on every call in development so new files appear without a restart,
 * and once per process in production.
 */
export const SKILLS_DIR = path.join(process.cwd(), "skills");

const SKILL_ID_PATTERN = /^[a-z0-9-]+$/;

let cache: Skill[] | undefined;

export function loadSkills(): Skill[] {
  if (cache && process.env.NODE_ENV === "production") {
    return cache;
  }
  cache = readSkills();
  return cache;
}

export function getSkill(id: string) {
  return loadSkills().find((skill) => skill.id === id);
}

function readSkills(): Skill[] {
  if (!existsSync(SKILLS_DIR)) {
    return [];
  }

  const skills: Skill[] = [];
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || !SKILL_ID_PATTERN.test(entry.name)) {
      continue;
    }
    const file = path.join(SKILLS_DIR, entry.name, "SKILL.md");
    if (!existsSync(file)) {
      continue;
    }
    const skill = parseSkill(entry.name, readFileSync(file, "utf8"));
    if (skill) {
      skills.push(skill);
    } else {
      console.warn(`[skills] ${file} has no instructions; skipped`);
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function parseSkill(id: string, source: string): Skill | null {
  const { frontmatter, body } = splitFrontmatter(source.replace(/\r\n/g, "\n"));
  const instructions = body.trim();
  if (!instructions) {
    return null;
  }
  return {
    id,
    name: frontmatter.name ?? titleFromId(id),
    description: frontmatter.description ?? "",
    instructions,
  };
}

/** Minimal `key: value` frontmatter between `---` fences; no YAML nesting */
function splitFrontmatter(source: string) {
  const frontmatter: Record<string, string> = {};
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter, body: source };
  }
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    if (key) {
      frontmatter[key] = value;
    }
  }
  return { frontmatter, body: source.slice(match[0].length) };
}

function titleFromId(id: string) {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

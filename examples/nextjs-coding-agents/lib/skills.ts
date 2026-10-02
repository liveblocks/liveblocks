/**
 * Skills are reusable instructions picked with "/" in the composer; the
 * message text that follows becomes the task. Each one is a folder in
 * `skills/` with a `SKILL.md` inside (see `lib/server/skills.ts`), so adding
 * a skill is just adding a file.
 */

/** What the browser knows about a skill; the instructions stay server-side */
export type SkillSummary = {
  // Folder name, used in `/id` and in the `<skill:id>` message token
  id: string;
  name: string;
  description: string;
};

export type Skill = SkillSummary & {
  // Markdown body of SKILL.md, prepended to the prompt sent to the agent
  instructions: string;
};

export function searchSkills<T extends SkillSummary>(
  skills: T[],
  query: string
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return skills;
  }
  return skills.filter(
    (skill) =>
      skill.id.includes(normalized) ||
      skill.name.toLowerCase().includes(normalized) ||
      skill.description.toLowerCase().includes(normalized)
  );
}

// Skills are stored inline in message markdown as `<skill:id>` tokens
export const SKILL_TOKEN_PATTERN = /<skill:([a-z0-9-]+)>/g;

export function getSkillIdsFromContent(content: string) {
  return [...content.matchAll(SKILL_TOKEN_PATTERN)]
    .map((match) => match[1])
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export function stripSkillTokens(content: string) {
  return content.replace(SKILL_TOKEN_PATTERN, "").replace(/\s+/g, " ").trim();
}

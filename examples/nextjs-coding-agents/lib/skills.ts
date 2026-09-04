export type Skill = {
  id: string;
  name: string;
  description: string;
  // Instructions prepended to the prompt sent to the agent
  instructions: string;
};

// Pre-baked skills, picked with "/" in the composer. Each one is a reusable
// set of instructions; the message text that follows it becomes the task.
export const SKILLS: Skill[] = [
  {
    id: "explain",
    name: "Explain",
    description: "Walk through how part of the codebase works",
    instructions:
      "Explain the relevant code without changing anything. Start from the entry point, follow the data flow, and reference concrete files and symbols with paths. Keep it under 300 words and finish with a short list of files worth reading next.",
  },
  {
    id: "fix-bug",
    name: "Fix bug",
    description: "Reproduce and fix a bug, with a regression test",
    instructions:
      "Treat the message as a bug report. First locate the root cause and explain it in one paragraph. Then apply the smallest fix that addresses the cause (not the symptom), add or update a test that fails before the fix and passes after, and run the relevant tests.",
  },
  {
    id: "write-tests",
    name: "Write tests",
    description: "Add tests for existing code",
    instructions:
      "Add tests for the code described in the message using the test framework and conventions already present in the repository. Cover the main behaviour, edge cases, and error paths. Do not change production code unless a test reveals a real bug; if it does, call it out explicitly. Run the new tests.",
  },
  {
    id: "refactor",
    name: "Refactor",
    description: "Improve structure without changing behaviour",
    instructions:
      "Refactor the code described in the message without changing its observable behaviour. Prefer small, well-named functions and removing duplication over introducing abstractions. Keep the public API stable, keep the diff focused, and run existing tests to confirm nothing changed.",
  },
  {
    id: "update-docs",
    name: "Update docs",
    description: "Write or update documentation",
    instructions:
      "Update the documentation for the code or feature described in the message. Match the tone, structure, and formatting of existing docs in the repository. Include a short example where it helps. Do not change code.",
  },
  {
    id: "changelog",
    name: "Changelog",
    description: "Add a changelog entry in the repo's format",
    instructions:
      "Add an entry to the repository's changelog for the change described in the message. Follow the existing file's format exactly (headings, ordering, tense, and package or section names). If there is no changelog, create one with a conventional layout and say so.",
  },
  {
    id: "review",
    name: "Review",
    description: "Review recent changes and report findings",
    instructions:
      "Review the code described in the message (or the most recent changes on the branch if none is given). Report bugs, risky changes, and missing tests first, then style issues. Be specific: reference files and lines, and propose concrete fixes. Do not modify files unless asked to.",
  },
];

export function getSkill(id: string) {
  return SKILLS.find((skill) => skill.id === id);
}

export function searchSkills(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SKILLS;
  }
  return SKILLS.filter(
    (skill) =>
      skill.id.includes(normalized) ||
      skill.name.toLowerCase().includes(normalized) ||
      skill.description.toLowerCase().includes(normalized)
  );
}

// Skills are stored inline in message markdown as `<skill:id>` tokens,
// alongside `<@userId>` mention tokens.
export const SKILL_TOKEN_PATTERN = /<skill:([a-z0-9-]+)>/g;

export function getSkillIdsFromContent(content: string) {
  return [...content.matchAll(SKILL_TOKEN_PATTERN)]
    .map((match) => match[1])
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export function stripSkillTokens(content: string) {
  return content.replace(SKILL_TOKEN_PATTERN, "").replace(/\s+/g, " ").trim();
}

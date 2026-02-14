/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { blue, dim, green, magenta, yellow } from "~/lib/term-colors";

interface GrepMatch {
  file: string;
  line: number;
  text: string;
}

function parseGrepOutput(output: string): GrepMatch[] {
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (!match) return null;
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        text: match[3],
      };
    })
    .filter((m): m is GrepMatch => m !== null);
}

async function gitGrep(...patterns: string[]): Promise<GrepMatch[]> {
  try {
    const args = [
      "git",
      "grep",
      "-nF",
      ...patterns.flatMap((p) => ["-e", p]),
      "--",
      ".",
    ];
    const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    return parseGrepOutput(output);
  } catch {
    return [];
  }
}

function isCommentedOut(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
}

/**
 * Checks the current working directory for common Liveblocks configuration
 * patterns and warns if they don't appear to be pointing at the local dev
 * server. Called on `liveblocks dev` startup.
 */
// Each check pairs a call site pattern with the baseUrl syntax to look for
// and the code snippet to suggest
interface Check {
  pattern: string;
  expected: string;
  fixSnippet: (baseUrl: string) => string;
}

const CHECKS: Check[] = [
  {
    pattern: "<LiveblocksProvider",
    expected: "baseUrl=",
    fixSnippet: (url) => `${magenta("baseUrl")}=${green(`"${url}"`)}`,
  },
  {
    pattern: "createClient(",
    expected: "baseUrl:",
    fixSnippet: (url) => `${magenta("baseUrl")}: ${green(`"${url}"`)}`,
  },
  {
    pattern: "new Liveblocks(",
    expected: "baseUrl:",
    fixSnippet: (url) => `${magenta("baseUrl")}: ${green(`"${url}"`)}`,
  },
];

export interface ConfigIssue {
  match: GrepMatch;
  check: Check;
}

/**
 * Scans the current working directory for Liveblocks call sites
 * (LiveblocksProvider, createClient, new Liveblocks) and warns if any of
 * them are missing a `baseUrl` pointing at the local dev server.
 */
export async function checkLiveblocksSetup(
  port: number
): Promise<ConfigIssue[]> {
  const baseUrl = `http://localhost:${port}`;
  const issues: ConfigIssue[] = [];

  for (const check of CHECKS) {
    const matches = (await gitGrep(check.pattern)).filter(
      (m) => !isCommentedOut(m.text)
    );
    if (matches.length === 0) continue;

    const baseUrlMatches = await gitGrep(check.expected);
    const filesWithBaseUrl = new Set(baseUrlMatches.map((m) => m.file));

    for (const m of matches) {
      if (!filesWithBaseUrl.has(m.file)) {
        issues.push({ match: m, check });
      }
    }
  }

  if (issues.length > 0) {
    console.log();
    console.warn(
      yellow("⚠ Your project may not be configured for the local dev server.")
    );
    console.log();
    console.log("  Missing baseUrl in the following location(s):\n");
    for (const { match, check } of issues) {
      console.log(`    ${blue(`${match.file}:${match.line}`)}`);
      console.log(`      To fix, add ${check.fixSnippet(baseUrl)}`);
      console.log();
    }
    console.log(dim("  ╭────────────────────────────────────────────────────╮")); // prettier-ignore
    console.log(dim("  │ Press p to copy an AI fix prompt to your clipboard │")); // prettier-ignore
    console.log(dim("  ╰────────────────────────────────────────────────────╯")); // prettier-ignore
    console.log();
  }

  return issues;
}

const PLAIN_FIX_SNIPPETS: Record<string, (url: string) => string> = {
  "<LiveblocksProvider": (url) => `baseUrl="${url}"`,
  "createClient(": (url) => `baseUrl: "${url}"`,
  "new Liveblocks(": (url) => `baseUrl: "${url}"`,
};

const DEV_KEY_FOR_PATTERN: Record<string, { prop: string; value: string }> = {
  "<LiveblocksProvider": { prop: "publicApiKey", value: "pk_localdev" },
  "createClient(": { prop: "publicApiKey", value: "pk_localdev" },
  "new Liveblocks(": { prop: "secret", value: "sk_localdev" },
};

export function buildFixPrompt(
  matches: ConfigIssue[],
  baseUrl: string
): string {
  const lines = [
    `In the following file(s), the Liveblocks setup is missing a \`baseUrl\` property pointing to the local dev server at ${baseUrl}. Please add the missing configuration:`,
    "",
  ];

  for (const { match, check } of matches) {
    const snippet =
      PLAIN_FIX_SNIPPETS[check.pattern]?.(baseUrl) ?? `baseUrl: "${baseUrl}"`;
    lines.push(
      `- In \`${match.file}\` at line ${match.line}, add \`${snippet}\` to the \`${check.pattern}\` call`
    );
  }

  lines.push(
    "",
    "Also make sure the API keys are set to the local dev server keys:"
  );

  const mentioned = new Set<string>();
  for (const { check } of matches) {
    const key = DEV_KEY_FOR_PATTERN[check.pattern];
    if (key && !mentioned.has(key.value)) {
      mentioned.add(key.value);
      lines.push(
        `- Set \`${key.prop}\` to \`"${key.value}"\` (either directly or via an environment variable)`
      );
    }
  }

  return lines.join("\n");
}

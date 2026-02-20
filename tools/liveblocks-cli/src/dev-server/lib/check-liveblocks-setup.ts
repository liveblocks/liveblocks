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

import { blue, bold, dim, green, magenta, yellow } from "~/lib/term-colors";

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
  closePattern: string;
  expected: string;
  fixSnippet: (baseUrl: string) => string;
}

const CHECKS: Check[] = [
  {
    pattern: "<LiveblocksProvider",
    expected: "baseUrl=",
    fixSnippet: (url) => `${magenta("baseUrl")}=${green(`"${url}"`)}`,
    closePattern: ">",
  },
  {
    pattern: "createClient(",
    expected: "baseUrl:",
    fixSnippet: (url) => `${magenta("baseUrl")}: ${green(`"${url}"`)}`,
    closePattern: ")",
  },
  {
    pattern: "new Liveblocks(",
    expected: "baseUrl:",
    fixSnippet: (url) => `${magenta("baseUrl")}: ${green(`"${url}"`)}`,
    closePattern: ")",
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
  baseUrl: string
): Promise<ConfigIssue[]> {
  // Run both greps in parallel: one for all call-site patterns, one for all
  // baseUrl patterns. This reduces up to 6 sequential git-grep invocations
  // down to 2 parallel ones.
  const allPatterns = CHECKS.map((c) => c.pattern);
  const allExpected = [...new Set(CHECKS.map((c) => c.expected))];

  const [callSiteMatches, baseUrlMatches] = await Promise.all([
    gitGrep(...allPatterns),
    gitGrep(...allExpected),
  ]);

  // Fast path: no call sites found at all
  if (callSiteMatches.length === 0) return [];

  const filesWithBaseUrl = new Set(baseUrlMatches.map((m) => m.file));

  const issues: ConfigIssue[] = [];
  for (const m of callSiteMatches) {
    if (isCommentedOut(m.text)) continue;
    if (filesWithBaseUrl.has(m.file)) continue;

    // Determine which check this match belongs to
    const check = CHECKS.find((c) => m.text.includes(c.pattern));
    if (check) {
      issues.push({ match: m, check });
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
      console.log(
        `      To fix, add ${check.fixSnippet(baseUrl)} to ${magenta(check.pattern)}${magenta(check.closePattern)}`
      );
      console.log();
    }
    console.log(dim("  ╭───────────────────────────────────────────────────────╮")); // prettier-ignore
    console.log(dim("  │ 💡 ") + "Press " + bold("p") + " to copy an AI fix prompt to your clipboard" + dim(" │")); // prettier-ignore
    console.log(dim("  ╰───────────────────────────────────────────────────────╯")); // prettier-ignore
    console.log();
    console.log(dim("  To skip this check, use --no-check"));
    console.log();
  }

  return issues;
}

const BASEURL_SYNTAX: Record<string, string> = {
  "<LiveblocksProvider": "baseUrl={...}",
  "createClient(": "baseUrl: ...",
  "new Liveblocks(": "baseUrl: ...",
};

export function buildFixPrompt(
  matches: ConfigIssue[],
  baseUrl: string
): string {
  const fileList = matches
    .map(({ match, check }) => {
      const syntax = BASEURL_SYNTAX[check.pattern] ?? "baseUrl: ...";
      return `     - In \`${match.file}\` at line ${match.line}, add \`${syntax}\` to the \`${check.pattern}\` call`;
    })
    .join("\n");

  return `# Set up Liveblocks dev server

1. Check which system the application is using for environment variables, then
   add a new environment variable called \`USE_LIVEBLOCKS_DEV_SERVER="true"\`.
   This will be used to enable the dev server. It needs to be available on the client, so it may need to be called
   \`NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER\` or similar. Do not rename or modify existing variables.
2. You must use \`"${baseUrl}"\` as a \`baseUrl\` when the dev server is
   enabled. In the following files add a \`baseUrl\` property for this when the
   dev server is enabled, otherwise set \`baseUrl\` to \`undefined\`:
${fileList}

3. Identify if the user is using \`publicApiKey\` in \`LiveblocksProvider\` or
   \`secret\` in \`new Liveblocks\`. Edit the existing property to use "pk_localdev"
   (for \`publicApikey\`) or "sk_localdev" (for \`secret\`) when the dev server is
   enabled.

## Examples

Remember to keep the user's current system for environment variables and names.
In the following snippets, I have given the following names, but the user's
system may work differently: \`process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\`
and \`process.env.LIVEBLOCKS_SECRET_KEY\`.

### Public key example

If the user is already using the public key with \`publicApKey\`:

\`\`\`env file=".env.local"
NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER="true"
\`\`\`

\`\`\`tsx file="src/app/Providers.tsx"
<LiveblocksProvider
  baseUrl={process.env.NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER === "true" ? "${baseUrl}" : undefined}
  publicApiKey={process.env.NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER === "true" ? "pk_localdev" : process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY}
\`\`\`

### Secret key example

If the user is already using their secret key with \`secret\`:

\`\`\`env file=".env.local"
NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER="true"
\`\`\`

\`\`\`tsx file="src/app/Providers.tsx"
<LiveblocksProvider
  baseUrl={process.env.NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER === "true" ? "${baseUrl}" : undefined}
\`\`\`

\`\`\`ts file="src/app/api/liveblocks-auth/route.ts"
new Liveblocks({
  baseUrl={process.env.NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER === "true" ? "${baseUrl}" : undefined}
  secret={process.env.NEXT_PUBLIC_USE_LIVEBLOCKS_DEV_SERVER === "true" ? "sk_localdev" : process.env.LIVEBLOCKS_SECRET_KEY}
\`\`\`

## Follow up

Explain to the user that you've enabled the Liveblocks dev server by adding a an
environment variable to the application, and share which file it is in. Explain
that the user can disable this by setting it to "false".`;
}

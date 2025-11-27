#!/usr/bin/env bun

import { relative } from "path";
import { Project, Node, SyntaxKind } from "ts-morph";
import { sorted } from "itertools";

// Configuration
const ALLOW_NO_JSDOCS = [
  "MutationContext",
  "RegisterAiKnowledgeProps",
  "RegisterAiToolProps",
  "UseSendAiMessageOptions",
  "UseThreadsOptions",
  "SendAiMessageOptions",
];

// Add any hooks here that are allowed to have a different doc string between
// their classic and suspense versions! Because... they're actually different!
// TODO Expand to still enforce a certain similarity percentage maybe later?
const ALLOW_DIFFERENT_JSDOCS = [
  "useInboxNotifications",
  "useRoomInfo",
  "useSelf",
  "useThreads",
  "useUnreadInboxNotificationsCount",
  "useUser",
  "useGroupInfo",
  "useAttachmentUrl",
  "useHistoryVersions",
  "useUrlMetadata",
];

// These exports may exist at the top-level without a factory equivalent
const ALLOW_NO_FACTORY = [
  "ClientSideSuspense",
  "createLiveblocksContext", // the factories themselves, obviously
  "createRoomContext", // the factories themselves, obviously

  // Re-exported from `@liveblocks/client` so they cannot be returned by
  // the factories. So it makes no sense to warn about these.
  "shallow",
  "isNotificationChannelEnabled",

  // TODO: These are all exported types, which cannot be returned by the
  // factories, so it makes no sense to warn about these. We should auto-detect
  // if these are types, and ignore them. For now, I'm hard-coding the list.
  "Json",
  "JsonObject",
  "MutationContext",
  "RegisterAiKnowledgeProps",
  "RegisterAiToolProps",
  "UseSendAiMessageOptions",
  "UseThreadsOptions",
  "SendAiMessageOptions",
  "AiChatStatus",
];

/**
 * Any exported symbols are by default expected to be exported from both
 * ./index and ./suspense subpaths.
 *
 * Note that this requirement is not needed if the exported symbol is marked
 * "private".
 *
 * To make an exception for public APIs here, add it to this list.
 */
const CLASSIC_ONLY = [
  "createLiveblocksContext",
  "createRoomContext",
  "useHistoryVersionData",
  "useSearchComments",
];
const SUSPENSE_ONLY = [];

// -------------------------------------------------------------------------------------

let numIssues = 0;

type Location = {
  file: string;
  lineno: number;
};

type ExportedSymbol = {
  location: Location;
  name: string;
  jsDoc?: string;
};

/**
 * Strips all indentation from the raw JSDoc comment string.
 */
function normalizeCommentText(rawText: string): string {
  rawText = rawText.trim();
  if (rawText.startsWith("/**")) {
    rawText = rawText.slice(3);
  }
  if (rawText.endsWith("*/")) {
    rawText = rawText.slice(0, -2);
  }
  rawText = rawText.trim();

  const lines = [];
  for (const line of rawText.split("\n")) {
    lines.push(line.replace(/^\s*\*\s*/, "").trim());
  }
  return lines.join("\n");
}

// Function to extract JSDoc comments from a node
function getJSDoc(node: Node): string {
  //
  // If node is a VariableDeclaration, then the JSDoc will not be associated to
  // it directly. Instead, the AST looks like:
  //
  //   VariableStatement              👈 This is where the JSDoc is attached typically
  //   -> VariableDeclarationList
  //      -> VariableDeclaration      👈 ...but we're here, so we'll have to walk up a bit
  //
  if (node.getKind() === SyntaxKind.VariableDeclaration) {
    node = node.getParentWhileOrThrow(
      (_parent, child) => child.getKind() !== SyntaxKind.VariableStatement
    );
  }

  return node
    .getChildrenOfKind(SyntaxKind.JSDoc)
    .map((block) => normalizeCommentText(block.getText()))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

// Function to display all exported symbols from a given file path
function* iterExports(filePath: string): Generator<ExportedSymbol> {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });

  const sourceFile = project.addSourceFileAtPath(filePath);

  const exportedDeclarations = sorted(
    sourceFile.getExportedDeclarations(),
    ([name]) => name.toLowerCase()
  );

  for (const [name, declarations] of exportedDeclarations) {
    for (const decl of declarations) {
      const jsDoc = getJSDoc(decl);
      yield {
        location: {
          file: decl.getSourceFile().getFilePath(),
          lineno: decl.getStartLineNumber(),
        },
        name,
        jsDoc,
      };
    }
  }
}

function listExports(filePath: string): ExportedSymbol[] {
  return Array.from(iterExports(filePath));
}

function listFactoryExports(filePath: string): {
  classic: string[];
  suspense: string[];
} {
  const { createRoomContext, createLiveblocksContext } = require(filePath);
  const factory1 = createRoomContext({} as any);
  const factory2 = createLiveblocksContext({} as any);
  const { suspense: suspense1, ...classic1 } = factory1;
  const { suspense: suspense2, ...classic2 } = factory2;
  return {
    classic: [...Object.keys(classic1), ...Object.keys(classic2)],
    suspense: [...Object.keys(suspense1), ...Object.keys(suspense2)],
  };
}

function isPrivate(sym: ExportedSymbol): boolean {
  return /\@private/.test(sym.jsDoc);
}

function formatLocation(sym: ExportedSymbol): string {
  const loc = sym.location;
  return `${yellow(relative(process.cwd(), loc.file))}:${magenta(loc.lineno)}`;
}

function warn(...args: unknown[]) {
  numIssues++;
  return console.warn(...args);
}

const classicExports = listExports("dist/index.d.ts");
const suspenseExports = listExports("dist/suspense.d.ts");
const factoryExports = listFactoryExports("../dist/index.js");

function blue(text: string | number): string {
  return `\x1b[34m${text}\x1b[0m`;
}

function magenta(text: string | number): string {
  return `\x1b[35m${text}\x1b[0m`;
}

function yellow(text: string | number): string {
  return `\x1b[33m${text}\x1b[0m`;
}

// Warn about any symbols that aren't documented yet
for (const sym of [...classicExports, ...suspenseExports]) {
  if (!sym.jsDoc) {
    if (!ALLOW_NO_JSDOCS.includes(sym.name)) {
      warn(
        formatLocation(sym),
        "Symbol",
        blue(sym.name),
        "has no JSDoc comment",
        "💬"
      );
    }
  }
}

function intersection<T>(xs: T[], ys: T[]): T[] {
  const result = [];
  for (const x of xs) {
    if (ys.includes(x)) {
      result.push(x);
    }
  }
  return result;
}

function difference<T>(xs: T[], ys: T[]): T[] {
  const result = [];
  for (const x of xs) {
    if (!ys.includes(x)) {
      result.push(x);
    }
  }
  return result;
}

function symmetricDifference<T>(xs: T[], ys: T[]): [T[], T[], T[]] {
  return [difference(xs, ys), difference(ys, xs), intersection(xs, ys)];
}

// Warn about any symbols that aren't documented yet
const classicNames = classicExports.map((e) => e.name);
const suspenseNames = suspenseExports.map((e) => e.name);

{
  let [missingInSuspense, missingInClassic] = symmetricDifference(
    difference(classicNames, CLASSIC_ONLY),
    difference(suspenseNames, SUSPENSE_ONLY)
  );

  for (const name of missingInSuspense) {
    const sym = classicExports.find((x) => x.name === name)!;
    if (isPrivate(sym)) continue;
    warn(
      formatLocation(sym),
      "Symbol",
      blue(sym.name),
      "has no suspense export",
      "⚠️"
    );
  }

  for (const name of missingInClassic) {
    const sym = suspenseExports.find((x) => x.name === name)!;
    if (isPrivate(sym)) continue;
    warn(
      formatLocation(sym),
      "Symbol",
      blue(sym.name),
      "has no classic export",
      "⚠️"
    );
  }
}

{
  let [missingInFactory, missingAtToplevel] = symmetricDifference(
    difference(classicNames, ALLOW_NO_FACTORY),
    factoryExports.classic
  );

  for (const name of missingInFactory) {
    const sym = classicExports.find((x) => x.name === name)!;
    if (isPrivate(sym)) continue;
    warn(
      formatLocation(sym),
      "Symbol",
      blue(sym.name),
      "has classic top-level export, but isn't returned by factory",
      "⚠️"
    );
  }

  for (const name of missingAtToplevel) {
    warn(
      "Symbol",
      blue(name),
      "is returned by factory, but has no classic top-level export",
      "⚠️"
    );
  }
}

{
  let [missingInFactory, missingAtToplevel] = symmetricDifference(
    difference(suspenseNames, ALLOW_NO_FACTORY),
    factoryExports.suspense
  );

  for (const name of missingInFactory) {
    const sym = suspenseExports.find((x) => x.name === name)!;
    if (isPrivate(sym)) continue;
    warn(
      formatLocation(sym),
      "Symbol",
      blue(sym.name),
      "has top-level suspense export, but isn't returned by factory (under { suspense } key)",
      "⚠️"
    );
  }

  for (const name of missingAtToplevel) {
    warn(
      "Symbol",
      blue(name),
      "is returned by factory under { suspense } key, but has no top-level suspense export",
      "⚠️"
    );
  }
}

for (const name of intersection(suspenseNames, classicNames)) {
  const sym1 = classicExports.find((x) => x.name === name)!;
  const sym2 = suspenseExports.find((x) => x.name === name)!;

  if (sym1.jsDoc !== sym2.jsDoc) {
    if (ALLOW_DIFFERENT_JSDOCS.includes(name)) {
      continue;
    }

    warn(
      "Symbol",
      blue(name),
      "has different doc strings for classic vs suspense!"
    );
    console.warn(
      [
        "    -------------------------------------------------",
        sym1.jsDoc
          .split("\n")
          .map((line) => `    [classic]  ${line}`)
          .join("\n"),
        "    -------------------------------------------------",
        sym2.jsDoc
          .split("\n")
          .map((line) => `    [suspense] ${line}`)
          .join("\n"),
        "    -------------------------------------------------",
      ]
        .flatMap((comment) => comment.split("\n"))
        .join("\n")
    );
    console.warn(
      "Either fix this, or allow it by adding this symbol to ALLOW_DIFFERENT_JSDOCS."
    );
    console.warn();
  }
}

if (numIssues > 0) {
  console.log(`Found ${numIssues} issue${numIssues !== 1 ? "s" : ""}`);
  process.exit(2);
} else {
  process.exit(0);
}

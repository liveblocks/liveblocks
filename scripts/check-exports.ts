#!/usr/bin/env bun

import { relative } from "path";
import { Project, Node, SyntaxKind } from "ts-morph";
import { sorted } from "itertools";

// Configuration
const ALLOW_NO_JSDOCS = ["MutationContext", "UseThreadsOptions"];

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

  const jsDocBlocks = node.getChildrenOfKind(SyntaxKind.JSDoc);
  // if (node.getText(true).includes("const RoomContext")) {
  //   for (const block of jsDocBlocks) {
  //     console.log({
  //       formattext: block.formatText(),
  //       gettext: block.getText(),
  //       getfulltext: block.getFullText(),
  //       getcomment: block.getComment(),
  //       getdescription: block.getDescription(),
  //       getindentationtext: block.getIndentationText(),
  //       // gettags: j.getTags(),
  //       // gettype: j.getType(),
  //       getcommenttext: block.getCommentText(),
  //       rv: jsDocBlocks
  //         .map((block) => normalizeCommentText(block.getText()))
  //         .filter(Boolean)
  //         .join("\n\n")
  //         .trim(),
  //     });
  //   }
  // }

  return jsDocBlocks
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

const classicExports = listExports("dist/index.d.mts");
const suspenseExports = listExports("dist/suspense.d.mts");

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

/**
 * Any symbol is by default expected to be exported in both ./index and
 * ./suspense. This isn't needed if the exported symbol has an @-private
 * directive.
 *
 * These symbols are expected to only exist in ./index, but not in ./suspense subpath.
 */
const CLASSIC_ONLY = ["createLiveblocksContext", "createRoomContext"];

// Warn about any symbols that aren't documented yet
const classicNames = classicExports.map((e) => e.name);
const suspenseNames = suspenseExports.map((e) => e.name);

for (const name of difference(classicNames, suspenseNames)) {
  if (CLASSIC_ONLY.includes(name)) {
    // Skip known classic-only symbols
    continue;
  }

  const sym = classicExports.find((x) => x.name === name)!;
  if (isPrivate(sym)) {
    // Skip check: @private-symbols are not required to have both exports
    continue;
  }

  warn(
    formatLocation(sym),
    "Symbol",
    blue(sym.name),
    "has no suspense export",
    "⚠️"
  );
}

for (const name of difference(suspenseNames, classicNames)) {
  const sym = suspenseExports.find((x) => x.name === name)!;
  if (isPrivate(sym)) {
    // Skip check: @private-symbols are not required to have both exports
    continue;
  }

  warn(
    formatLocation(sym),
    "Symbol",
    blue(sym.name),
    "has no classic export",
    "⚠️"
  );
}

for (const name of intersection(suspenseNames, classicNames)) {
  const sym1 = classicExports.find((x) => x.name === name)!;
  const sym2 = suspenseExports.find((x) => x.name === name)!;

  if (sym1.jsDoc !== sym2.jsDoc) {
    warn(
      "Symbol",
      blue(name),
      "has different doc strings for classic vs suspense"
      // TODO: Show diff here?
    );
  }
}

if (numIssues > 0) {
  console.log(`Found ${numIssues} issue${numIssues !== 1 ? "s" : ""}`);
  process.exit(2);
} else {
  process.exit(0);
}

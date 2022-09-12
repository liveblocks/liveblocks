import { readFileSync } from "fs";
import type {
  PropertySignature,
  TypeAliasDeclaration,
  JSDoc,
  NodeArray,
  TypeLiteralNode,
} from "typescript";
import {
  createSourceFile,
  isMethodSignature,
  isPropertySignature,
  isTypeAliasDeclaration,
  ScriptTarget,
} from "typescript";

function subtract<T>(x: T[], y: T[]): T[] {
  return x.filter((xi) => !y.includes(xi));
}

function equalSets<T>(x: T[], y: T[]): boolean {
  return x.length === y.length && x.every((i) => y.includes(i));
}

const SRC_FILE = "src/types.ts";

const srcFile = createSourceFile(
  SRC_FILE,
  readFileSync(SRC_FILE, "utf8"),
  ScriptTarget.ESNext,
  /* setParentNodes */ true
);

// Find "type RoomContextBundle = ..."
const mainBundleNode = srcFile.statements.find(
  (stm): stm is TypeAliasDeclaration =>
    isTypeAliasDeclaration(stm) && stm.name.text === "RoomContextBundle"
);

// Find the "suspense:" subkey
const suspenseBundleNode = (
  mainBundleNode.type as TypeLiteralNode
).members.find((m) => m.name.getText() === "suspense") as PropertySignature;

// List all the members in the "main" bundle (without "suspense")
const mainBundleMembers = (mainBundleNode.type as TypeLiteralNode).members
  .filter((m) => isPropertySignature(m) || isMethodSignature(m))
  .filter((m) => m.name.getText() !== "suspense");

// List all the members in the "suspense" bundle
const suspenseMembers = (
  suspenseBundleNode.type as TypeLiteralNode
).members.filter((m) => isPropertySignature(m) || isMethodSignature(m));

//
// Compare them!
//

const mainBundleMemberNames = Array.from(
  new Set(mainBundleMembers.map((m) => m.name.getText()))
);

const suspenseMemberNames = Array.from(
  new Set(suspenseMembers.map((m) => m.name.getText()))
);

let exitcode = 0;

{
  const missing = subtract(mainBundleMemberNames, suspenseMemberNames);
  if (missing.length > 0) {
    console.log("The following members are not exported in `suspense`:");
    for (const member of missing) {
      console.log(`- ${member}`);
    }
    exitcode = 1;
  }
}

{
  const missing = subtract(suspenseMemberNames, mainBundleMemberNames);
  if (missing.length > 0) {
    console.log(
      'The following members exported in `suspense`, but not as "normal" exports:'
    );
    for (const member of missing) {
      console.log(`- ${member}`);
    }
    exitcode = 1;
  }
}

function unify(s: string): string {
  return s.replace(/\s+/g, " ");
}

function getPairwise(name: string): [main: string[], suspense: string[]] {
  const mainNodes = mainBundleMembers.filter((m) => m.name.getText() === name);
  const suspenseNodes = suspenseMembers.filter(
    (m) => m.name.getText() === name
  );

  if (mainNodes.length === 0 || suspenseNodes.length === 0) {
    throw new Error(`${name} not found`);
  }

  const jsDocs1 = mainNodes.map(
    (mainNode) => (mainNode as any).jsDoc as NodeArray<JSDoc> | undefined
  );
  const jsDocs2 = suspenseNodes.map(
    (suspenseNode) =>
      (suspenseNode as any).jsDoc as NodeArray<JSDoc> | undefined
  );

  const comment1 = jsDocs1.map((jsDoc) => unify(String(jsDoc[0]?.comment)));
  const comment2 = jsDocs2.map((jsDoc) => unify(String(jsDoc[0]?.comment)));

  return [comment1, comment2];
}

{
  for (const name of subtract(
    mainBundleMemberNames,
    subtract(mainBundleMemberNames, suspenseMemberNames)
  )) {
    const [comments1, comments2] = getPairwise(name);
    if (!equalSets(comments1, comments2)) {
      console.log("---------------------------------------------------------");
      console.log("JSDoc differences found!");
      console.log("");
      console.log(`Normal version of ${name}:`);
      if (comments1.length === 0) {
        console.log("  - undocumented");
      }
      for (const comment of comments1) {
        console.log(`  - ${comment}`);
      }
      console.log("");
      console.log("vs");
      console.log("");
      console.log(`Suspense version of ${name}:`);
      if (comments2.length === 0) {
        console.log("  - undocumented");
      }
      for (const comment of comments2) {
        console.log(`  - ${comment}`);
      }
      exitcode = 2;
    }
  }
}

// console.log(getPairwise("useOthers"));

process.exit(exitcode);

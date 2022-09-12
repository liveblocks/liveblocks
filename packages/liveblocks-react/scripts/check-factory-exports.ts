import { readFileSync } from "fs";
import type {
  PropertySignature,
  TypeAliasDeclaration,
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

{
  const missing = subtract(mainBundleMemberNames, suspenseMemberNames);
  if (missing.length > 0) {
    console.log("The following members are not exported in `suspense`:");
    for (const member of missing) {
      console.log(`- ${member}`);
    }
    process.exit(1);
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
    process.exit(1);
  }
}

import fs from "fs";
import path from "path";

import { LiveblocksSchema } from "../../dist/index.js";

const ERROR_CHARACTER = "⚠";

// TODO: Share helpers with /packages/liveblocks-schema/src/__tests__/examples.test.ts

function* readFiles(dirpath: string): IterableIterator<string> {
  const files = fs.readdirSync(dirpath);
  for (const file of files) {
    if (file.startsWith(".")) {
      continue;
    }

    const filePath = path.join(dirpath, file);
    const fileStat = fs.statSync(filePath);
    if (fileStat.isDirectory()) {
      yield* readFiles(filePath);
    } else if (fileStat.isFile()) {
      yield path.join(filePath);
    }
  }
}

function readExamplesSync(filename: string): string[] {
  return fs.readFileSync(filename, { encoding: "utf-8" }).split("---\n");
}

function declareJestTest(filename: string) {
  const basename = path.basename(filename);
  return /\bskip\b/i.test(basename)
    ? it.skip
    : /\bfail\b/i.test(basename)
    ? it.failing
    : // TODO: Improve syntax.grammar and enable tests again
      it.skip;
}

type TestSrc = readonly [string, string, string];
//                         /        |        \
//                    File path  Test name  Contents

describe("LiveblocksSchema", () => {
  const parser = LiveblocksSchema.parser;
  const exampleFiles: string[] = Array.from(
    readFiles(path.join(__dirname, "../../../liveblocks-schema/examples/good"))
  );

  // Each file can consist of multiple "sections", each being a test of its
  // own.
  const exampleTests: readonly TestSrc[] = exampleFiles.flatMap((filename) => {
    const chunks = readExamplesSync(filename);
    return chunks.map((content, index) => {
      return [
        filename,
        chunks.length > 1
          ? `${path.basename(filename)} [${index + 1}/${chunks.length}]`
          : path.basename(filename),
        content,
      ] as const;
    });
  });

  // Simple test
  it("simple.schema", () => {
    const schema = fs.readFileSync(
      path.resolve(__dirname, "./simple.schema"),
      "utf-8"
    );

    expect(parser.parse(schema).toString()).not.toContain(ERROR_CHARACTER);
  });

  // Advanced tests
  exampleTests
    .filter(([, name]) => !name.startsWith("FAIL"))
    .map(([f, name, content]) => {
      declareJestTest(f)(name, () => {
        expect(parser.parse(content).toString()).not.toContain(ERROR_CHARACTER);
      });
    });
});

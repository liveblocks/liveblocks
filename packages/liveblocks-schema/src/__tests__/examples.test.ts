import fs from "fs";
import path from "path";

import { parse as parseAndCheck } from "..";
import { parseDocument as parseOnly } from "../parser";

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

/**
 * Reads an example from disk. If a preamble marker is found in the file, it
 * will be stripped off before being fed to the parser. This can be used to
 * leave comments describing the test, if something needs to be clarified about
 * it.
 */
async function readExample(f: string): Promise<string> {
  // TODO: Strip off preamble
  return fs.promises.readFile(f, { encoding: "utf-8" });
}

function declareJestTest(filename: string) {
  const basename = path.basename(filename);
  return /\bskip\b/i.test(basename)
    ? it.skip
    : /\bfail\b/i.test(basename)
    ? it.failing
    : it;
}

describe("examples", () => {
  const exampleFiles: string[] = Array.from(
    readFiles(path.join(__dirname, "../../examples"))
  );

  //
  // Dynamically generate test cases for each example file found on disk. The
  // sub directory where it's found will define its behavior:
  //
  //   good/        Should parse & be a valid document
  //   bad/         Should parse, but NOT be a valid document
  //   bad-syntax/  Should not even parse
  //

  describe("good examples", () => {
    exampleFiles
      .filter((f) => f.includes("/good/"))
      .map((f) =>
        declareJestTest(f)(path.basename(f), async () => {
          expect(parseAndCheck(await readExample(f)).root).toEqual({
            _kind: "ObjectTypeDef",
            name: {
              _kind: "TypeName",
              name: "Storage",
              range: expect.anything(),
            },
            obj: expect.anything(),
            range: expect.anything(),
          });
        })
      );
  });

  describe("parses syntactically, but still not valid", () => {
    exampleFiles
      .filter((f) => f.includes("/bad-semantics/"))
      .map((f) =>
        declareJestTest(f)(path.basename(f), async () => {
          const input = await readExample(f);

          // Parsing should work syntactically
          expect(parseOnly(input)).toEqual({
            _kind: "Document",
            definitions: expect.anything(),
            range: expect.anything(),
          });

          // Should fail during semantic checking phase. Either this is
          // a regression in the type checker, or we'll need to move this
          // example file to the "good/" directory.
          //
          // TODO Check for specific error type + message here
          //
          expect(() => parseAndCheck(input)).toThrow();
        })
      );
  });

  describe("should fail to parse syntax", () => {
    exampleFiles
      .filter((f) => f.includes("/bad-syntax/"))
      .map((f) => {
        declareJestTest(f)(path.basename(f), async () => {
          const input = await readExample(f);

          // Parsing should not even work syntactically
          //
          // TODO Check for specific error type + message here
          //
          expect(() => parseOnly(input)).toThrow(/Parse error/);
        });
      });
  });
});

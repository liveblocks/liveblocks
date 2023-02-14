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
function readExamplesSync(filename: string): string[] {
  return fs.readFileSync(filename, { encoding: "utf-8" }).split("---\n");
}

function escapeRegex(value: string): string {
  return (
    value
      .replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&")
      // Interpret "***" as a wildcard
      .replace("\\*\\*\\*", ".*")
  );
}

function declareJestTest(filename: string) {
  const basename = path.basename(filename);
  return /\bskip\b/i.test(basename)
    ? it.skip
    : /\bfail\b/i.test(basename)
    ? it.failing
    : it;
}

type TestSrc = readonly [string, string, string, RegExp | undefined];
//                         /        |        \        \
//                    File path  Test name  Contents  Expected error message

describe("examples", () => {
  const exampleFiles: string[] = Array.from(
    readFiles(path.join(__dirname, "../../examples"))
  );

  // Each file can consist of multiple "sections", each being a test of its
  // own.
  const exampleTests: readonly TestSrc[] = exampleFiles.flatMap((filename) => {
    const chunks = readExamplesSync(filename);
    return chunks.map((content, index) => {
      // Now remove all lines starting with "^", and interpret them as inline
      // error annotations
      let errmsg: RegExp | undefined;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const annotation = line.match(/^(\s*)[\^]+([|]?)\s*(.*)$/);
        if (annotation) {
          const lineno1 = i;
          const column1 = annotation[1].length + 1;
          const noPosOrNoExactPosition = annotation[2] !== "";
          const expectedErrorText =
            annotation[3] || "<no expected error message>";
          errmsg = new RegExp(
            "^" +
              escapeRegex(
                noPosOrNoExactPosition
                  ? `${expectedErrorText}***`
                  : `${expectedErrorText} (at ${lineno1}:${column1})`
              ) +
              "$"
          );
          lines.splice(i, 1);
          break;
        }
      }
      content = lines.join("\n");
      return [
        filename,
        chunks.length > 1
          ? `${path.basename(filename)} [${index + 1}/${chunks.length}]`
          : path.basename(filename),
        content,
        errmsg,
      ] as const;
    });
  });

  //
  // Dynamically generate test cases for each example file found on disk. The
  // sub directory where it's found will define its behavior:
  //
  //   good/        Should parse & be a valid document
  //   bad/         Should parse, but NOT be a valid document
  //   bad-syntax/  Should not even parse
  //

  describe("good examples", () => {
    exampleTests
      .filter(([f]) => f.includes("/good/"))
      .map(([f, name, content, expectedError]) =>
        declareJestTest(f)(name, () => {
          if (expectedError) {
            throw new Error(
              `Unexpected error annotation found in test file "${path.basename(
                f
              )}" (files in good/ are not expected to fail)`
            );
          }

          expect(parseAndCheck(content).root).toEqual({
            _kind: "ObjectTypeDefinition",
            name: {
              _kind: "TypeName",
              name: "Storage",
              range: expect.anything(),
            },
            fields: expect.anything(),
            range: expect.anything(),
          });
        })
      );
  });

  describe("parses syntactically, but still not valid", () => {
    exampleTests
      .filter(([f]) => f.includes("/bad-semantics/"))
      .map(([f, name, content, expectedError]) =>
        declareJestTest(f)(name, () => {
          // Parsing should work syntactically
          expect(parseOnly(content)).toEqual({
            _kind: "Document",
            definitions: expect.anything(),
            range: expect.anything(),
          });

          if (!expectedError) {
            throw new Error(
              `Missing expected error annotation test file "${path.basename(
                f
              )}"`
            );
          }

          // Should fail during semantic checking phase. Either this is
          // a regression in the type checker, or we'll need to move this
          // example file to the "good/" directory.
          //
          // TODO Check for specific error type + message here
          //
          expect(() => parseAndCheck(content)).toThrow(expectedError);
        })
      );
  });

  describe("should fail to parse syntax", () => {
    exampleTests
      .filter(([f]) => f.includes("/bad-syntax/"))
      .map(([f, name, content, expectedError]) =>
        declareJestTest(f)(name, () => {
          if (!expectedError) {
            throw new Error(
              `Missing expected error annotation test file "${path.basename(
                f
              )}"`
            );
          }

          // Parsing should not even work syntactically
          //
          // TODO Check for specific error type + message here
          //
          expect(() => parseOnly(content)).toThrow(expectedError);
        })
      );
  });
});

import path from "path";
import { readFileSync, readdirSync } from "fs";
import { describe, test, expect } from "vitest";
import jscodeshift from "jscodeshift";

// A Vitest-compatible simplified reimplementation of the `defineTest` helper from jscodeshift.
// https://github.com/facebook/jscodeshift/blob/main/src/testUtils.js
export function defineTestsForTransform(
  transform: string,
  options?:
    | Record<string, any>
    | ((args: { transform: string; fixture: string }) => Record<string, any>)
) {
  const transformPath = path.resolve(__dirname, "..", transform);
  const fixturesPath = path.resolve(__dirname, "./__fixtures__", transform);
  const fixtures = readdirSync(fixturesPath)
    .filter((file) => file.endsWith(".input.tsx"))
    .map((file) => file.replace(".input.tsx", ""));

  describe(transform, () => {
    for (const fixture of fixtures) {
      test(`should transform ${fixture}`, async () => {
        const inputPath = path.join(fixturesPath, `${fixture}.input.tsx`);
        const outputPath = path.join(fixturesPath, `${fixture}.output.tsx`);

        const input = readFileSync(inputPath, "utf8");
        const output = readFileSync(outputPath, "utf8");

        const transform = await import(transformPath);
        const result = transform.default(
          {
            path: inputPath,
            source: input,
          },
          {
            jscodeshift: jscodeshift.withParser("tsx"),
            stats: () => {},
          },
          {
            parser: "tsx",
            ...(typeof options === "function"
              ? options({ transform, fixture })
              : options),
          }
        );

        expect(result).toBe(output);
      });
    }
  });
}

import path from "path";
import { readFileSync, readdirSync } from "fs";
import { describe, test, expect } from "vitest";
import jscodeshift from "jscodeshift";

const INPUT_FILE_REGEX = /\.input\.([jt]sx?)$/;

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
    .map((file) => {
      const match = file.match(INPUT_FILE_REGEX);

      if (!match) {
        return null;
      }

      const [, extension] = match;
      const fixture = file.replace(INPUT_FILE_REGEX, "");

      return {
        name: fixture,
        inputPath: path.join(fixturesPath, `${fixture}.input.${extension}`),
        outputPath: path.join(fixturesPath, `${fixture}.output.${extension}`),
      };
    })
    .filter((fixture) => fixture !== null);

  describe(transform, () => {
    for (const fixture of fixtures) {
      test(`should transform ${fixture.name}`, async () => {
        const input = readFileSync(fixture.inputPath, "utf8");
        const output = readFileSync(fixture.outputPath, "utf8");

        const transform = await import(transformPath);
        const result = transform.default(
          {
            path: fixture.inputPath,
            source: input,
          },
          {
            jscodeshift: jscodeshift.withParser("tsx"),
            stats: () => {},
          },
          {
            parser: "tsx",
            ...(typeof options === "function"
              ? options({ transform, fixture: fixture.name })
              : options),
          }
        );

        expect(result).toBe(output);
      });
    }
  });
}

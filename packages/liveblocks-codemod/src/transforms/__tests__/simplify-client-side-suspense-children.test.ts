/* eslint-disable */

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod
{
  const defineTest = require("jscodeshift/dist/testUtils").defineTest;
  const { readdirSync } = require("fs");
  const { join } = require("path");

  const fixtureDir = "simplify-client-side-suspense-children";
  const fixtureDirPath = join(__dirname, "..", "__testfixtures__", fixtureDir);
  const fixtures = readdirSync(fixtureDirPath)
    .filter((file) => file.endsWith(".input.tsx"))
    .map((file) => file.replace(".input.tsx", ""));

  for (const fixture of fixtures) {
    const prefix = `${fixtureDir}/${fixture}`;
    const options = {} as { suspense?: boolean };

    if (fixture.includes("suspense")) {
      options.suspense = true;
    }

    defineTest(__dirname, fixtureDir, options, prefix, {
      parser: "tsx",
    });
  }
}

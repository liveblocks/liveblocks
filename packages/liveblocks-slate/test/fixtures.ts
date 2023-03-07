import * as fs from "fs";
import { basename, extname, resolve } from "path";

// rome-ignore lint/suspicious/noExplicitAny: Not worth typing
export function fixtures<P extends any[]>(...args: P) {
  let fn = args.pop();
  let options = { skip: false };

  if (typeof fn !== "function") {
    options = fn;
    fn = args.pop();
  }

  const path = resolve(...args);
  const files = fs.readdirSync(path);
  const dir = basename(path);
  const d = options.skip ? describe.skip : describe;

  d(dir, () => {
    for (const file of files) {
      const p = resolve(path, file);
      const stat = fs.statSync(p);

      if (stat.isDirectory()) {
        fixtures(path, file, fn);
      }
      if (
        stat.isFile() &&
        (file.endsWith(".js") ||
          file.endsWith(".tsx") ||
          file.endsWith(".ts")) &&
        !file.endsWith("custom-types.ts") &&
        !file.endsWith("type-guards.ts") &&
        !file.startsWith(".") &&
        // Ignoring `index.js` files allows us to use the fixtures directly
        // from the top-level directory itself, instead of only children.
        file !== "index.js"
      ) {
        const name = basename(file, extname(file));

        it(`${name} `, async () => {
          const module = await import(p);

          if (
            module.skip === true ||
            (typeof module.skip === "function" && module.skip())
          ) {
            return;
          }

          await fn({ name, path, module });
        });
      }
    }
  });
}

fixtures.skip = <P extends unknown[]>(...args: P) => {
  fixtures(...args, { skip: true });
};

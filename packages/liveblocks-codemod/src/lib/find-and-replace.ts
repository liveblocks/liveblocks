import fs from "fs";
import globby from "globby";

export function findAndReplace(
  glob: string,
  callback: (content: string) => string
) {
  const files = globby.sync(glob, {
    gitignore: true,
    ignore: ["**/node_modules/**"],
    dot: false,
  });

  try {
    for (const file of files) {
      const content = fs.readFileSync(file, { encoding: "utf-8" });

      fs.writeFileSync(file, callback(content), { encoding: "utf-8" });
    }
  } catch (error) {
    // console.error(error);
  }
}

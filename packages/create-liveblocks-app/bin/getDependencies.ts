import { readFileSync } from "fs";
import { join } from "path";

export function getDependencies({ appDir }: { appDir: string }) {
  try {
    const data = readFileSync(join(appDir, "package.json"), "utf8");
    return JSON.parse(data).dependencies;
  } catch (err) {
    console.error(err);
    return null;
  }
}

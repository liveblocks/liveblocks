import fs from "fs";
import path from "path";

const directory = path.join(process.cwd(), "./bin");
const files = fetchFilesRecursively(directory);

export const esbuildOptions = {
  entryPoints: files,
  bundle: false,
  outdir: path.join(process.cwd(), "./dist"),
  platform: "node",
};

export function fetchFilesRecursively(currentPath) {
  let files = [];
  fs.readdirSync(currentPath).forEach(file => {
    const newPath = path.join(currentPath, file);
    if (fs.statSync(newPath).isDirectory()) {
      const filesInNestedFolder = fetchFilesRecursively(newPath);
      filesInNestedFolder.forEach(file => {
        files.push(file);
      });
    } else {
      files.push(newPath);
    }
  });
  return files;
}

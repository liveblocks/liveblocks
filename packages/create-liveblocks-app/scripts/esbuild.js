import path from "path";

export const esbuildOptions = {
  entryPoints: [path.join(process.cwd(), "./bin/index.ts")],
  bundle: true,
  outfile: path.join(process.cwd(), "./dist/index.cjs"),
  platform: "node",
  banner: { js: "#!/usr/bin/env node" },
};

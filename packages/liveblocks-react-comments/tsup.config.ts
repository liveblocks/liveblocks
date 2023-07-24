import { defineConfig } from "tsup";
import { transform, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";
import fs from "fs";

const STYLES_PATH = "./src/styles";
const TARGETS = browserslistToTargets(
  browserslist("last 2 versions and not dead")
);

type File = {
  name: string;
  path: string;
};

function minifyAndCopyCssFiles() {
  const files: File[] = fs
    .readdirSync(STYLES_PATH, { withFileTypes: true })
    .filter((item) => !item.isDirectory())
    .map((item) => ({
      name: item.name,
      path: `${STYLES_PATH}/${item.name}`,
    }));

  for (const file of files) {
    const { code, map } = transform({
      filename: file.name,
      code: fs.readFileSync(file.path),
      targets: TARGETS,
      minify: true,
      sourceMap: true,
      drafts: {
        nesting: true,
      },
    });

    fs.writeFileSync(`./${file.name}`, code);

    if (map) {
      fs.writeFileSync(`./${file.name}.map`, map);
    }
  }
}

export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts"],
  external: ["react-dom"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2020",
  format: ["esm", "cjs"],
  sourcemap: true,
  async onSuccess() {
    minifyAndCopyCssFiles();
  },
});

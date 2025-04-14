import { createConfig } from "../../shared/tsup-config";

export default createConfig([
  "src/index.ts",
  "src/suspense.ts",
  "src/_private.ts",
]);

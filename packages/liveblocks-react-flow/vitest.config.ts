import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";
import { mergeConfig } from "vite";

export default mergeConfig(
  defaultLiveblocksVitestConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["vitest.setup.ts"],
    },
  }),
  {
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  }
);

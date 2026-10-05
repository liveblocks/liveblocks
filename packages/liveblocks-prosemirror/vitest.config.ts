import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.[jt]s?(x)"],
  },
});

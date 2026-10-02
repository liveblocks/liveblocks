import type { BetterAuthClientPlugin } from "better-auth/client";
import { createAuthClient } from "better-auth/react";
import type { demoLogin } from "./api/demo-login";

function demoLoginClient() {
  return {
    id: "demo-login",
    $InferServerPlugin: {} as ReturnType<typeof demoLogin>,
    pathMethods: {
      "/sign-in/demo": "POST",
    },
    atomListeners: [
      {
        matcher: (path) => path === "/sign-in/demo",
        signal: "$sessionSignal",
      },
    ],
  } satisfies BetterAuthClientPlugin;
}

export const authClient = createAuthClient({
  plugins: [demoLoginClient()],
});

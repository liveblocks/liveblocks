import { getCookie } from "cookies-next";
import {
  SessionContextValue,
  useSession as useNextAuthSession,
} from "next-auth/react";
import { useEffect, useState } from "react";
import { AUTHENTICATION_DEMO_MODE } from "../../../liveblocks.config";
import { getUser } from "../database";

/**
 * NOTE: This file is used to enable a demo authentication system,
 * if NextAuth is set up you can just the following instead:
 * `import { useSession } from "next-auth/react";`
 */

export const useSession = AUTHENTICATION_DEMO_MODE
  ? useDemoSession
  : useNextAuthSession;

// === EVERYTHING BELOW ONLY NECESSARY FOR DEMO AUTH ===========================

type UseSessionReturn<R extends boolean> =
  | SessionContextValue<R>
  | {
      readonly data: null;
      readonly status: "loading" | "unauthenticated";
    };

function useDemoSession<R extends boolean>(): UseSessionReturn<R> {
  const [authValue, setAuthValue] = useState<UseSessionReturn<R>>({
    data: null,
    status: "loading",
  });

  useEffect(() => {
    async function run() {
      const userId = getCookie("demoAuthUser") as string;

      if (!userId) {
        setAuthValue({
          data: null,
          status: "unauthenticated",
        });
        return;
      }

      // Demo auth relies on imitation `users` database
      const user = await getUser(userId);

      if (!user) {
        return;
      }

      const date = new Date(Date.now());
      date.setDate(date.getDate() + 30);
      const expiryString = date.toISOString();

      const session: SessionContextValue<R> = {
        data: {
          user: {
            info: user,
          },
          expires: expiryString,
        },
        status: "authenticated",
      };

      setAuthValue(session);
    }

    run();
  }, []);

  return authValue;
}

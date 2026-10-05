import { betterAuth } from "better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { demoLogin } from "./demo-login";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export const auth = betterAuth({
  session: {
    expiresIn: SESSION_MAX_AGE,
    cookieCache: {
      enabled: true,
      maxAge: SESSION_MAX_AGE,
      strategy: "jwe",
      refreshCache: true,
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },
  plugins: [demoLogin()],
});

export const { GET, POST } = toNextJsHandler(auth);

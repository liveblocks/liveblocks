import { Liveblocks } from "@liveblocks/node";
import { getProviders } from "@/auth";

// Your Liveblocks secret key
export const SECRET_API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

export const liveblocks = new Liveblocks({ secret: SECRET_API_KEY as string });

// ============================================================================
if (typeof window !== "undefined") {
  console.log();
  console.error(
    "DANGER: You're using data from /liveblocks.server.config.ts on the client"
  );
  console.error("This may expose your secret key(s)");
  console.log();
}

if (!SECRET_API_KEY) {
  throw new Error(`You must add your Liveblocks secret key to .env.local to use the starter kit 

Example .env.local file:
LIVEBLOCKS_SECRET_KEY=sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

You can find your secret keys on https://liveblocks.io/dashboard/apikeys 
Follow the full starter kit guide on https://liveblocks.io/docs/guides/nextjs-starter-kit
 
`);
}

(async () => {
  const providers = await getProviders();

  if (providers?.github) {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      console.log(`Your GitHub secrets are missing from .env.local

Example .env.local file:
GITHUB_CLIENT_ID=sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GITHUB_CLIENT_SECRET=sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

Follow the full starter kit guide to learn how to get them:
https://liveblocks.io/docs/guides/nextjs-starter-kit#github-authentication
      `);
    }
  }

  if (providers?.auth0) {
    if (
      !process.env.AUTH0_CLIENT_ID ||
      !process.env.AUTH0_CLIENT_SECRET ||
      !process.env.AUTH0_ISSUER_BASE_URL
    ) {
      throw new Error(`Your Auth0 secrets are missing from .env.local

Example .env.local file:
AUTH0_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AUTH0_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AUTH0_ISSUER_BASE_URL=https://XXXXXXXXXXXXXXXXXX.com

Follow the full starter kit guide to learn how to get them:
https://liveblocks.io/docs/guides/nextjs-starter-kit#auth0-authentication
      `);
    }
  }
})();

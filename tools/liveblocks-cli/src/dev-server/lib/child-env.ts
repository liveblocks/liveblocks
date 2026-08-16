/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

export const LOCAL_PUBLIC_KEY = "pk_localdev";
export const LOCAL_SECRET_KEY = "sk_localdev";

/**
 * Environment variables handed to `--cmd` child processes.
 *
 * An app that reads its Liveblocks connection details from the environment
 * therefore talks to this dev server without any edit to its source or its
 * `.env` files. That is the point: the same working tree runs against the
 * cloud or against the dev server, with nothing to stage, stash or revert.
 *
 * These values intentionally take precedence over inherited ones. A parent
 * environment holding real cloud credentials is the common case, and those
 * credentials are useless here: the dev server only accepts its own local
 * keys. Passing a real secret through would fail confusingly.
 *
 * Bundlers only expose variables carrying their own prefix to client code, so
 * the client-side names are listed per framework rather than derived: Next.js
 * `NEXT_PUBLIC_`, Vite `VITE_`, SvelteKit `PUBLIC_`. That same rule is why no
 * secret appears under any of them, since such a name means "ship me to the
 * browser". Server-side code reads the unprefixed `LIVEBLOCKS_SECRET_KEY`.
 *
 * Nuxt needs no prefixed entry: `nuxt.config.ts` runs in Node, so it reads the
 * unprefixed names and forwards what it wants through `runtimeConfig.public`.
 */
export function childEnv(
  hostname: string,
  port: number
): Record<string, string> {
  const baseUrl = `http://${hostname}:${port}`;

  return {
    LIVEBLOCKS_DEV_SERVER_HOST: hostname,
    LIVEBLOCKS_DEV_SERVER_PORT: String(port),

    LIVEBLOCKS_BASE_URL: baseUrl,
    LIVEBLOCKS_PUBLIC_KEY: LOCAL_PUBLIC_KEY,
    LIVEBLOCKS_SECRET_KEY: LOCAL_SECRET_KEY,

    NEXT_PUBLIC_LIVEBLOCKS_BASE_URL: baseUrl,
    NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY: LOCAL_PUBLIC_KEY,

    VITE_LIVEBLOCKS_BASE_URL: baseUrl,
    VITE_LIVEBLOCKS_PUBLIC_KEY: LOCAL_PUBLIC_KEY,

    PUBLIC_LIVEBLOCKS_BASE_URL: baseUrl,
    PUBLIC_LIVEBLOCKS_PUBLIC_KEY: LOCAL_PUBLIC_KEY,
  };
}

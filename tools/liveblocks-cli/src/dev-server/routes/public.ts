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

import { abort, html, json, ZenRouter } from "@liveblocks/zenrouter";

import { getBlobStore } from "~/dev-server/blobs/store";
import welcomeHtml from "~/dev-server/static/welcome.html";

export const zen = new ZenRouter({
  authorize: () => true, // Fine for public routes
});

// Happy path for WebSocket upgrades is handled by Bun server directly (not ZenRouter)
// If the happy path isn't taken, reject the connections
zen.route("GET /v7", () => abort(426));
zen.route("GET /v8", () => abort(426));

zen.route("GET /health", () => json({ status: "ok" }));
zen.route("GET /", () =>
  html(
    (welcomeHtml as unknown as string).replace(
      "__VERSION__",
      typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev"
    )
  )
);

/**
 * Serve a LiveFile blob to whoever holds a valid signed link.
 *
 * Unauthenticated by design: this is the dev-server stand-in for an object
 * store's presigned URL, and the browser fetches it as an <img> src or similar,
 * with no opportunity to attach a header. All the authority is in the query
 * string, and the store checks it.
 *
 * Dev-server-only, so it's listed in DEVSERVER_ONLY_ROUTES in the route-parity
 * check — production hands out R2 URLs, which never come back to us.
 */
zen.route("GET /blob", async ({ url }) => {
  const store = getBlobStore();

  const key = store.verifySignedGetUrl(url.searchParams);
  if (key === undefined) {
    abort(403);
  }

  const meta = await store.head(key);
  const body = await store.get(key);
  if (!meta || !body) {
    abort(404);
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": meta.contentType || "application/octet-stream",
      "Content-Disposition": meta.contentDisposition,
      "Content-Length": String(meta.size),
    },
  });
});

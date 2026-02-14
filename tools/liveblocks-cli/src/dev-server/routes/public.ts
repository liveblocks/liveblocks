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

import welcomeHtml from "../static/welcome.html";

export const zen = new ZenRouter({
  authorize: () => true, // Fine for public routes
});

// Happy path for WebSocket upgrades is handled by Bun server directly (not ZenRouter)
// If the happy path isn't taken, reject the connections
zen.route("GET /v7", () => abort(426));
zen.route("GET /v8", () => abort(426));

zen.route("GET /health", () => json({ status: "ok" }));

zen.route("GET /", () => html(welcomeHtml as unknown as string));

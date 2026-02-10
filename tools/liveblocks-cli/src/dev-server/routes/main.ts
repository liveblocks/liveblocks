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

import { ZenRouter } from "zenrouter";

import { verifyJwtLite } from "../lib/jwt-lite";

export const zen = new ZenRouter({
  authorize: ({ req }) => {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return false;

    const token = header.slice(7); // Remove "Bearer " prefix
    const payload = verifyJwtLite(token);
    return payload !== null;
  },
});

zen.route("GET /v2/rooms/<roomId>/storage", () => {
  return { root: "Implement me" };
});

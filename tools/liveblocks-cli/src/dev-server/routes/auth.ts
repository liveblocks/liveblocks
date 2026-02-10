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

import { Permission } from "@liveblocks/core";
import { array, enum_, object, optional, record, string } from "decoders";
import { json, ZenRouter } from "zenrouter";

import { userInfo } from "../lib/decoders";
import { createJwtLite } from "../lib/jwt-lite";

// Valid permission values (from @liveblocks/core Permission enum)
const permission = enum_(Permission);

export const zen = new ZenRouter({
  authorize: ({ req }) => {
    const header = req.headers.get("Authorization");
    if (header === "Bearer sk_localdev") {
      return true;
    }

    // Provide better error messages
    if (!header)
      throw json({ error: "Unauthorized", message: "Missing secret key" }, 401);

    if (header.startsWith("Bearer "))
      throw json(
        {
          error: "Forbidden",
          message:
            "Invalid secret key. The Liveblocks dev server can only be used with 'sk_localdev' as a secret key",
        },
        403
      );

    // If it's not a common mistake, return a generic 403 response
    return false;
  },
});

zen.route(
  "POST /v2/authorize-user",

  object({
    userId: string,
    userInfo: optional(userInfo),
    permissions: record(array(permission)),
  }),

  ({ body }) => {
    const token = createJwtLite({
      k: "acc",
      pid: "localdev",
      uid: body.userId,
      perms: body.permissions,
      ui: body.userInfo,
    });
    return { token };
  }
);

zen.route("POST /v2/identify-user", () => {
  throw json(
    {
      error: "Not supported",
      message:
        "ID tokens are not supported with the local dev server. To develop locally, use access tokens instead (via POST /v2/authorize-user).",
    },
    404
  );
});

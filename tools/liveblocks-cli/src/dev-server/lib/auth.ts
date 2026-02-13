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

import { json } from "@liveblocks/zenrouter";

/**
 * Authorizes a request by checking for a valid secret key in the Authorization header.
 * Returns true if authorized, throws an error response if unauthorized, or returns false
 * for generic unauthorized cases.
 */
export function authorizeSecretKey(req: Request): boolean {
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
}

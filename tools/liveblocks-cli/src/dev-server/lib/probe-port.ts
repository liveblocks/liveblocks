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

import Bun from "bun";

/**
 * Check if a port is already in use by attempting a TCP
 * connection.
 */
export function isPortInUse(port: number, hostname: string): Promise<boolean> {
  const { promise, resolve } = Promise.withResolvers<boolean>();
  void Bun.connect({
    hostname,
    port,
    socket: {
      data() {}, // prettier-ignore
      open(socket) { socket.end(); resolve(true) }, // prettier-ignore
      error() { resolve(false) }, // prettier-ignore
      connectError() { resolve(false) }, // prettier-ignore
    },
  });
  return promise;
}

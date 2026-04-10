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

/**
 * Generic, minimal, WebSocket interface that must be available or implemented
 * on the server.
 */
export interface IServerWebSocket {
  /**
   * Send should be synchronous and never throw. It should return:
   * - Return  -1 if sending was attempted, but there was back pressure
   *                 (i.e. the receiving end wasn't ready to accept more
   *                  bytes right now)
   * - Return   0 if sending failed (due to a connection issue)
   * - Return >=1 if sent successfully (number of bytes sent)
   */
  send(msg: string | ArrayBuffer): number;

  close(code: number, reason?: string): void;

  /**
   * Optional. Returns the last auto-response timestamp. Used only on
   * Cloudflare, where pings and pongs are typically handled by an
   * auto-response.
   */
  getLastPongTimestamp?(): Date | null;
}

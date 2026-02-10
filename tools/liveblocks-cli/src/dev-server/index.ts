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

import { parse } from "@bomb.sh/args";
import type { JsonObject } from "@liveblocks/core";
import type { SessionKey, Ticket } from "@liveblocks/server";
import { DefaultMap, Room } from "@liveblocks/server";
import Bun from "bun";
import { ZenRelay } from "zenrouter";

import type { SubCommand } from "../SubCommand.js";
import { authorizeWebSocket } from "./auth";
import { BunSQLiteDriver } from "./plugins/BunSQLiteDriver";
import { zen as authRoutes } from "./routes/auth";
import { zen as mainRoutes } from "./routes/main";
import { zen as publicRoutes } from "./routes/public";

type RoomMeta = string; // Room metadata: just use the room ID
type SessionMeta = never;
type ClientMeta = JsonObject; // Public session metadata, sent to clients in ROOM_STATE

type SocketData = {
  readonly room: Room<RoomMeta, SessionMeta, ClientMeta>;
  readonly ticket: Ticket<SessionMeta, ClientMeta>;
  readonly sessionKey: SessionKey;
};

// Stores a list of all "loaded room instances"
const rooms = new DefaultMap<string, Room<RoomMeta, SessionMeta, ClientMeta>>(
  (roomId) => {
    const storage = new BunSQLiteDriver(
      `.liveblocks/v1/rooms/${encodeURIComponent(roomId)}.db`
    );
    const room = new Room<RoomMeta, SessionMeta, ClientMeta>(roomId, {
      storage,
      // hooks: {
      //   onSessionDidStart(session) {
      //     const numSessions = room.numSessions;
      //     console.log(`Users in room: ${numSessions - 1} → ${numSessions}`);
      //   },
      //
      //   onSessionDidEnd(session) {
      //     const numSessions = room.numSessions;
      //     console.log(`Users in room: ${numSessions + 1} → ${numSessions}`);
      //   },
      // },
    });
    return room;
  }
);

const zen = new ZenRelay();
zen.relay("/v2/authorize-user/*", authRoutes); // Require sk_* header
zen.relay("/v2/*", mainRoutes); // Require JWT header
zen.relay("/*", publicRoutes); // Require no auth

// L → 1
// I → 1
// V → 5 (roman)
// E → 3 (mirrored)
const DEFAULT_PORT = 1153;

const dev: SubCommand = {
  description: "Start the local Liveblocks dev server",

  run(_argv) {
    const args = parse(_argv, {
      string: ["port"],
      boolean: ["help"],
      default: { port: DEFAULT_PORT },
      alias: { h: "help", p: "port" },
    });

    if (args.help) {
      console.log("Usage: liveblocks dev [options]");
      console.log();
      console.log("Start the local Liveblocks dev server");
      console.log();
      console.log("Options:");
      console.log(
        `  -p, --port   Port to listen on (default: ${DEFAULT_PORT})`
      );
      console.log("  -h, --help   Show this help message");
      return;
    }

    const port = Number(args.port) || DEFAULT_PORT;
    const server = Bun.serve<SocketData>({
      port,

      async fetch(req, server) {
        // WebSocket bypass - handle upgrades directly
        if (req.headers.get("Upgrade") === "websocket") {
          const authResult = authorizeWebSocket(req);
          if (!authResult) return new Response("Unauthorized", { status: 403 });

          const [roomId, ticketData] = authResult;

          // Look up or create the room for the requested room ID
          const room = rooms.getOrCreate(roomId);
          await room.load();

          const ticket = await room.createTicket(ticketData);
          const sessionKey = ticket.sessionKey;
          const success = server.upgrade(req, {
            data: { room, ticket, sessionKey },
          });
          if (success) {
            // Bun automatically returns a 101 Switching Protocols
            // if the upgrade succeeds
            return undefined;
          }

          return new Response("Could not upgrade to WebSocket", {
            status: 426,
          });
        }

        // Defer all other routing to ZenRouter
        return zen.fetch(req);
      },

      // Bun will call this if an error happens during the handling of an HTTP request
      error(err): Response {
        // YYY Define a lint rule that forbids the use of `console`, in favor of
        // using `ctx.logger`
        console.error(err);
        return new Response("An unknown error occurred", { status: 500 });
      },

      websocket: {
        // The socket is opened
        open(ws): void {
          const { room, ticket } = ws.data;
          room.startBrowserSession(ticket, ws);
        },

        // A message is received
        async message(ws, data): Promise<void> {
          const { room, sessionKey } = ws.data;
          await room.handleData(sessionKey, data);
        },

        // The socket is closed by the client side
        close(ws, code, message): void {
          const { room, sessionKey } = ws.data;
          room.endBrowserSession(sessionKey, code, message);
        },

        // The socket is ready to receive more data
        // drain(ws): void {
        //   // Will be invoked if a previous .send() message returned -1 (there
        //   // was back pressure), but now (at a later moment) the socket is ready
        //   // to receive more data, so we may want to re-attempt this.
        // },
      },
    });

    // -----------------------------------------------------------------------------

    console.log(
      `Liveblocks dev server running at http://${server.hostname}:${server.port}`
    );
  },
};

export default dev;

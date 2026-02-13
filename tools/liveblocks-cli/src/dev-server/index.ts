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
import { WebsocketCloseCodes as CloseCode } from "@liveblocks/core";
import type { Room, SessionKey, Ticket } from "@liveblocks/server";
import { ZenRelay } from "@liveblocks/zenrouter";
import Bun from "bun";

import type { SubCommand } from "../SubCommand.js";
import { authorizeWebSocket } from "./auth";
import type { ClientMeta, RoomMeta, SessionMeta } from "./db/rooms";
import * as RoomsDB from "./db/rooms";
import { zen as authRoutes } from "./routes/auth";
import { zen as clientApiRoutes } from "./routes/client-api.js";
import { zen as publicRoutes } from "./routes/public";
import { zen as restApiRoutes } from "./routes/rest-api.js";

type SocketData = {
  readonly room?: Room<RoomMeta, SessionMeta, ClientMeta>;
  readonly ticket?: Ticket<SessionMeta, ClientMeta>;
  readonly sessionKey?: SessionKey;
  readonly refuseConnection?: {
    readonly code: CloseCode;
    readonly message: string;
  };
};

function refuseSocketConnection(
  server: Bun.Server<SocketData>,
  req: Request,
  code: CloseCode,
  message: string
): Response | undefined {
  const success = server.upgrade(req, {
    data: {
      refuseConnection: { code, message },
    },
  });

  if (success) {
    // Bun automatically returns a 101 Switching Protocols if the upgrade succeeds.
    // The connection will be closed in the open handler.
    return undefined;
  }

  // If upgrade failed, return an error response
  return new Response("Could not upgrade to WebSocket", { status: 426 });
}

const zen = new ZenRelay();
zen.relay("/v2/authorize-user/*", authRoutes); // Require sk_* header
zen.relay("/v2/c/*", clientApiRoutes); // Require JWT header
zen.relay("/v2/*", restApiRoutes); // Require Auth header (Bearer sk_*)
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
      hostname: "localhost",
      port,

      async fetch(req, server) {
        // WebSocket bypass - handle upgrades directly
        if (req.headers.get("Upgrade") === "websocket") {
          const authResult = authorizeWebSocket(req);

          if (!authResult) {
            return refuseSocketConnection(
              server,
              req,
              CloseCode.NOT_ALLOWED,
              "You have no access to this room"
            );
          }

          const [roomId, ticketData] = authResult;

          // Look up or create the room for the requested room ID
          const room = RoomsDB.getOrCreate(roomId);
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
          const { refuseConnection, room, ticket } = ws.data;

          // If this connection should be refused, close it immediately
          if (refuseConnection) {
            ws.close(refuseConnection.code, refuseConnection.message);
            return;
          }

          if (room && ticket) {
            room.startBrowserSession(ticket, ws);
          }
        },

        // A message is received
        async message(ws, data): Promise<void> {
          const { room, sessionKey } = ws.data;
          // Ignore messages for refused connections
          if (room && sessionKey) {
            await room.handleData(sessionKey, data);
          }
        },

        // The socket is closed by the client side
        close(ws, code, message): void {
          const { room, sessionKey } = ws.data;
          // Ignore close events for refused connections
          if (room && sessionKey) {
            room.endBrowserSession(sessionKey, code, message);
          }
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

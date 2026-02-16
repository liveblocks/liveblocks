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

import type { SubCommand } from "~/interfaces/SubCommand";
import { dim, green, red, yellow } from "~/lib/term-colors";

import { authorizeWebSocket } from "./auth";
import type { ClientMeta, RoomMeta, SessionMeta } from "./db/rooms";
import * as RoomsDB from "./db/rooms";
import {
  buildFixPrompt,
  checkLiveblocksSetup,
} from "./lib/check-liveblocks-setup";
import { copyToClipboard } from "./lib/clipboard";
import { isPortInUse } from "./lib/probe-port";
import { clearWarnings, warnOnce } from "./lib/xwarn";
import { zen as authRoutes } from "./routes/auth";
import { zen as clientApiRoutes } from "./routes/client-api";
import { zen as publicRoutes } from "./routes/public";
import { zen as restApiRoutes } from "./routes/rest-api";

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
zen.relay("/v2/identify-user/*", authRoutes); // Require sk_* header
zen.relay("/v2/c/*", clientApiRoutes); // Require JWT header
zen.relay("/v2/*", restApiRoutes); // Require Auth header (Bearer sk_*)
zen.relay("/*", publicRoutes); // Require no auth

// L → 1
// I → 1
// V → 5 (roman)
// E → 3 (mirrored)
const DEFAULT_PORT = 1153;

/**
 * Parses a string as a positive integer, returning undefined if it's not valid.
 */
function parsePort(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 65535 ? n : undefined;
}

const dev: SubCommand = {
  description: "Start the local Liveblocks dev server",

  async run(_argv) {
    const args = parse(_argv, {
      string: ["port", "host"],
      boolean: ["help"],
      alias: { h: "help", p: "port" },
    });

    if (args.help) {
      console.log("Usage: liveblocks dev [options]");
      console.log();
      console.log("Start the local Liveblocks dev server");
      console.log();
      console.log("Options:");
      console.log(`  -p, --port   Port to listen on (default: ${DEFAULT_PORT})`); // prettier-ignore
      console.log("      --host   Host to bind to (default: localhost)");
      console.log("  -h, --help   Show this help message");
      return;
    }

    const port = parsePort(args.port) ?? DEFAULT_PORT;
    const hostname = args.host || "localhost";

    if (await isPortInUse(port, hostname)) {
      console.error(
        `Port ${port} is already in use.\nIs another dev server already running?`
      );
      process.exit(1);
    }

    const server = Bun.serve<SocketData>({
      hostname,
      port,

      async fetch(req, server) {
        // WebSocket bypass - handle upgrades directly
        if (req.headers.get("Upgrade") === "websocket") {
          const authResult = authorizeWebSocket(req);

          if (!authResult.ok) {
            warnOnce(authResult.xwarn);
            return refuseSocketConnection(
              server,
              req,
              CloseCode.NOT_ALLOWED,
              "You have no access to this room"
            );
          }

          const { roomId, ticketData } = authResult;

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
            console.log(`${green("101")} WS ${new URL(req.url).pathname}`);
            return undefined;
          }

          return new Response("Could not upgrade to WebSocket", {
            status: 426,
          });
        }

        // Defer all other routing to ZenRouter
        // TODO: Maybe port this logging to ZenRouter natively
        const url = new URL(req.url);
        const route = `${req.method} ${url.pathname}`;
        const resp = await zen.fetch(req);
        const status = resp.status;
        const colorStatus =
          status >= 500
            ? red(String(status))
            : status >= 400
              ? yellow(String(status))
              : green(String(status));
        console.log(`${colorStatus} ${route}`);
        const warnMsg = resp.headers.get("X-LB-Warn") ?? undefined;
        const warnKey = resp.headers.get("X-LB-Warn-Key") ?? undefined;
        warnOnce(warnMsg, warnKey);
        return resp;
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
        async open(ws): Promise<void> {
          const { refuseConnection, room, ticket } = ws.data;

          // If this connection should be refused, close it immediately
          if (refuseConnection) {
            ws.close(refuseConnection.code, refuseConnection.message);
            return;
          }

          if (room && ticket) {
            await room.startBrowserSession(ticket, ws);
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

    // Check if the current project is configured to use the local dev server
    const configIssues = await checkLiveblocksSetup(port);
    const baseUrl = `http://localhost:${port}`;

    console.log(dim("Press q to quit, c to clear"));

    // Listen for keypresses
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", (data: Buffer) => {
        const ch = data.toString();
        if (ch === "q" || ch === "\x03" /* Ctrl-C */) {
          void server.stop().then(() => process.exit(0));
        } else if (ch === "c") {
          console.clear();
          clearWarnings();
        } else if (ch === "p") {
          if (configIssues.length > 0) {
            const prompt = buildFixPrompt(configIssues, baseUrl);
            copyToClipboard(prompt);
            console.log(dim("Copied AI fix prompt to clipboard"));
          } else {
            console.log(dim("No setup issues detected"));
          }
        }
      });
    }
  },
};

export default dev;

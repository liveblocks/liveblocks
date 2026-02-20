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

import { WebsocketCloseCodes as CloseCode } from "@liveblocks/core";
import type { Room, SessionKey, Ticket } from "@liveblocks/server";
import { ZenRelay } from "@liveblocks/zenrouter";
import Bun from "bun";
import { join } from "path";

import type { SubCommand } from "~/interfaces/SubCommand";
import { parseArgs } from "~/lib/args";
import { bold, dim, green, red, yellow } from "~/lib/term-colors";

import { authorizeWebSocket } from "./auth";
import type { ClientMeta, RoomMeta, SessionMeta } from "./db/rooms";
import * as RoomsDB from "./db/rooms";
import {
  buildFixPrompt,
  checkLiveblocksSetup,
} from "./lib/check-liveblocks-setup";
import { copyToClipboard } from "./lib/clipboard";
import { isPortInUse } from "./lib/probe-port";
import { warn } from "./lib/xwarn";
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

function shellCmd(cmd: string): string[] {
  return process.platform === "win32"
    ? [process.env.COMSPEC || "cmd.exe", "/c", cmd]
    : ["sh", "-c", cmd];
}

type Options = {
  port: string;
  host: string;
  cmd?: string;
  help: boolean;
  "no-check": boolean;
  ci: boolean;
  verbose: boolean;
};

const dev: SubCommand = {
  description: "Start the local Liveblocks dev server",

  async run(argv) {
    const { options } = parseArgs<Options>(argv, {
      port: { type: "string", short: "p", default: DEFAULT_PORT.toString() },
      host: { type: "string", default: "localhost" },
      cmd: { type: "string", short: "c" },
      help: { type: "boolean", short: "h", default: false },
      "no-check": { type: "boolean", default: false },
      ci: { type: "boolean", default: false },
      verbose: { type: "boolean", short: "v", default: false },
    });

    if (options.help) {
      console.log("Usage: liveblocks dev [options]");
      console.log();
      console.log("Start the local Liveblocks dev server");
      console.log();
      console.log("Options:");
      console.log(`  --port, -p      Port to listen on (default: ${DEFAULT_PORT})`); // prettier-ignore
      console.log("  --host          Host to bind to (default: localhost)");
      console.log("  --cmd, -c       Run a one-off command against a fresh server instance, then"); // prettier-ignore
      console.log("                    shut down. Does not affect your local data in .liveblocks/."); // prettier-ignore
      console.log("  --ci            Start a fresh server instance on every boot, ideal for CI"); // prettier-ignore
      console.log("  --no-check      Skip project setup check on start");
      console.log("  --verbose, -v   Show verbose output");
      console.log("  --help, -h      Show help");
      return;
    }

    let ephemeral = false;

    // --ci implies ephemeral + --no-check
    if (options.ci) {
      ephemeral = true;
      options["no-check"] = true;
    }

    // --cmd implies ephemeral + --no-check
    if (options.cmd) {
      // NOTE: While this is CURRENTLY the same as --ci, we keep it separate in
      // case we want to have different implications here in the future
      ephemeral = true;
      options["no-check"] = true;
    }

    // Precedence: CLI flag > env var > default
    const port =
      parsePort(options.port) ??
      parsePort(process.env.LIVEBLOCKS_DEVSERVER_PORT) ??
      DEFAULT_PORT;
    const hostname =
      options.host || process.env.LIVEBLOCKS_DEVSERVER_HOST || "localhost";

    const ephemeralPath = ephemeral ? RoomsDB.useEphemeralStorage() : null;

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
            warn(authResult.xwarn, true);
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
            console.log(
              `${green("101")} WS ${new URL(req.url).pathname}${dim(` - ${roomId}`)}`
            );
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
        warn(warnMsg, !resp.ok);
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

    const stderr = (msg: string) => process.stderr.write(msg + "\n");

    stderr(
      `Liveblocks dev server ${dim(`v${__VERSION__}`)} running at http://${server.hostname}:${server.port}`
    );
    if (ephemeralPath && options.verbose) {
      stderr(dim(`Ephemeral mode, using ${ephemeralPath}`));
    }

    if (options.cmd) {
      // Redirect all further console output to a log file
      const logPath = join(ephemeralPath!, "server.log");
      stderr(dim(`Server logs: ${logPath}`));

      const logFile = Bun.file(logPath).writer();
      const writeLine = (...args: unknown[]) => {
        void logFile.write(args.map(String).join(" ") + "\n");
        void logFile.flush();
      };
      console.log = writeLine;
      console.error = writeLine;

      // Spawn child process, then shut down on exit
      let code = 1;
      try {
        const proc = Bun.spawn(shellCmd(options.cmd), {
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
          env: {
            ...process.env,
            LIVEBLOCKS_DEV_SERVER_HOST: hostname,
            LIVEBLOCKS_DEV_SERVER_PORT: String(port),
          },
        });

        // If we get killed, take the child tree down with us
        const killChild = () => {
          proc.kill();
        };
        process.on("SIGTERM", killChild);
        process.on("SIGINT", killChild);

        code = await proc.exited;
      } finally {
        void logFile.end();
        await server.stop();
        RoomsDB.cleanup();
        stderr(dim("Liveblocks dev server shut down"));
      }
      process.exit(code);
    } else {
      // Check if the current project is configured to use the local dev server
      const baseUrl = `http://${hostname}:${port}`;
      const configIssues = options["no-check"] ? [] : await checkLiveblocksSetup(baseUrl); // prettier-ignore

      // Listen for keypresses
      console.log(
        dim("Press ") +
          bold("q") +
          dim(" to quit, ") +
          bold("c") +
          dim(" to clear")
      );

      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on("data", (data: Buffer) => {
        const ch = data.toString();
        if (ch === "q" || ch === "\x03" /* Ctrl-C */) {
          void server.stop().then(() => {
            RoomsDB.cleanup();
            process.exit(0);
          });
        } else if (ch === "c") {
          console.clear();
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

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

import {
  Promise_withResolvers,
  WebsocketCloseCodes as CloseCode,
} from "@liveblocks/core";
import type { Millis, Room, SessionKey, Ticket } from "@liveblocks/server";
import { ZenRelay } from "@liveblocks/zenrouter";
import Bun from "bun";
import { join } from "path";

import type { SubCommand } from "~/interfaces/SubCommand";
import { parseArgs } from "~/lib/args";
import {
  bold,
  dim,
  green,
  magenta,
  red,
  stripAnsi,
  yellow,
} from "~/lib/term-colors";

import { authorizeWebSocket } from "./auth";
import type { ClientMeta, RoomMeta, SessionMeta } from "./db/rooms";
import * as Rooms from "./db/rooms";
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
  host?: string;
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
      host: { type: "string" },
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

    const ephemeralPath = ephemeral ? Rooms.useEphemeralStorage() : null;

    if (await isPortInUse(port, hostname)) {
      console.error(
        `Port ${port} is already in use.\nIs another dev server already running?`
      );
      process.exit(1);
    }

    let server: Bun.Server<SocketData>;

    function createServer() {
      return Bun.serve<SocketData>({
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

            // Do not accept connections when in maintenance mode
            if (Rooms.shouldRefuseConnection(roomId)) {
              return refuseSocketConnection(
                server,
                req,
                CloseCode.TRY_AGAIN_LATER,
                "Server is undergoing maintenance, try again later"
              );
            }

            // Look up or create the room for the requested room ID
            const room = Rooms.getRoomInstance(roomId);
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

          // Force-reboot: drop all connections (clients see 1006) and restart
          const url = new URL(req.url);
          if (req.method === "POST" && url.pathname === "/crash") {
            console.log(`${green("204")} POST /crash`);
            setTimeout(() => void reboot(), 0);
            return new Response(null, { status: 204 });
          }

          // Defer all other routing to ZenRouter
          // TODO: Maybe port this logging to ZenRouter natively
          const route = `${req.method} ${url.pathname}`;
          const resp = await zen.fetch(req);
          const status = resp.status;
          const colorStatus =
            status >= 500
              ? red(status)
              : status >= 400
                ? yellow(status)
                : green(status);
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
    }

    server = createServer();

    async function reboot() {
      Rooms.unloadAll();
      await server.stop(true);
      server = createServer();
      console.log("Crash \uD83D\uDCA5");
    }

    // -----------------------------------------------------------------------------

    const stderr = (msg: string) => process.stderr.write(msg + "\n");

    if (options.cmd) {
      stderr(
        `Liveblocks dev server ${dim(`v${__VERSION__}`)} running at http://${server.hostname}:${server.port}`
      );
      if (ephemeralPath && options.verbose) {
        stderr(dim(`Ephemeral mode, using ${ephemeralPath}`));
      }
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
        Rooms.cleanup();
        stderr(dim("Liveblocks dev server shut down"));
      }
      process.exit(code);
    } else {
      // Check if the current project is configured to use the local dev server
      const baseUrl = `http://${hostname}:${port}`;
      const configIssues = options["no-check"] ? [] : await checkLiveblocksSetup(baseUrl); // prettier-ignore

      // -----------------------------------------------------------------------
      // Tab system: "logs" (default) and "sockets"
      // -----------------------------------------------------------------------
      type Tab = "logs" | "sockets";
      let activeTab: Tab = "logs";
      let rebootTimer: ReturnType<typeof setTimeout> | null = null;
      let maintenanceRelease: (() => void) | null = null;
      let repaintTimer: ReturnType<typeof setInterval> | null = null;

      // -- Tab bar -------------------------------------------------------------
      const serverUrl = `http://${server.hostname}:${server.port}`;

      const renderTabBar = (): string => {
        const logsTab = activeTab === "logs" ? bold(" Logs ") : dim(" Logs ");
        const socketsTab =
          activeTab === "sockets" ? bold(" Sockets ") : dim(" Sockets ");
        const left = logsTab + dim("|") + socketsTab;
        const maintenance = maintenanceRelease
          ? magenta("\u23F8 maintenance") + "  "
          : "";
        const right = maintenance + dim(`Liveblocks running at ${serverUrl}`);
        const cols = process.stdout.columns ?? 80;
        const padding = Math.max(
          1,
          cols - stripAnsi(left).length - stripAnsi(right).length
        );
        return left + " ".repeat(padding) + right;
      };

      // -- Log buffering -----------------------------------------------------
      // Intercept console.log so logs are always captured. When the logs tab
      // is active they're written to stdout immediately. When on another tab
      // they accumulate and get replayed on switch.
      const logBuffer: string[] = [];
      const originalLog = console.log.bind(console);
      console.log = (...args: unknown[]) => {
        const line = args.map(String).join(" ");
        logBuffer.push(line);
        if (activeTab === "logs") {
          originalLog(line);
        }
      };

      const logsLegend = (): string =>
        dim("  ") +
        bold("q") +
        dim(" quit, ") +
        bold("!") +
        dim(" crash, ") +
        bold("c") +
        dim(" clear");

      const switchToLogs = (): void => {
        if (repaintTimer) {
          clearInterval(repaintTimer);
          repaintTimer = null;
        }
        activeTab = "logs";
        process.stdout.write("\x1B[2J\x1B[H");
        originalLog(renderTabBar());
        originalLog(logsLegend());
        originalLog();
        for (const line of logBuffer) {
          originalLog(line);
        }
      };

      // -- Socket list state -------------------------------------------------
      let selectedIndex = 0;
      type SocketEntry = Rooms.ActiveConnection & { alive: boolean };
      let socketList: SocketEntry[] = [];

      const entryKey = (e: { roomId: string; actor: number }): string =>
        `${e.roomId}:${e.actor}`;

      const refreshSocketList = (): void => {
        socketList = Rooms.listActiveConnections().map((c) => ({
          ...c,
          alive: true,
        }));
      };

      const syncSocketList = (): void => {
        const live = new Set(Rooms.listActiveConnections().map(entryKey));
        for (const entry of socketList) {
          entry.alive = live.has(entryKey(entry));
        }
        const known = new Set(socketList.map(entryKey));
        for (const conn of Rooms.listActiveConnections()) {
          if (!known.has(entryKey(conn))) {
            socketList.push({ ...conn, alive: true });
          }
        }
      };

      const formatAge = (since: Millis): string => {
        const ms = Date.now() - since;
        const s = Math.floor(ms / 1000);
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        return `${h}h`;
      };

      const activityBlip = (lastActivity: Millis | undefined): string => {
        if (!lastActivity) return "";
        const ago = Date.now() - lastActivity;
        if (ago < 1000) return " " + green("\u25CF");
        if (ago < 3000) return " " + dim(green("\u25CF"));
        if (ago < 5000) return " " + dim("\u25CF");
        return "";
      };

      const nextAliveIndex = (from: number, direction: -1 | 1): number => {
        let i = from + direction;
        while (i >= 0 && i < socketList.length) {
          if (socketList[i].alive) return i;
          i += direction;
        }
        return from;
      };

      const renderSockets = (): void => {
        syncSocketList();
        const aliveCount = socketList.filter((e) => e.alive).length;

        process.stdout.write("\x1B[2J\x1B[H");

        originalLog(renderTabBar());
        originalLog(
          dim("  ") +
            bold("\u2191\u2193") +
            dim(" navigate, ") +
            bold("k") +
            dim(" kill, ") +
            bold("m") +
            dim(
              maintenanceRelease ? " maintenance off, " : " maintenance on, "
            ) +
            bold("r") +
            dim(" refresh")
        );
        originalLog();
        originalLog("  " + bold("Connections") + dim(` (${aliveCount} alive)`));
        originalLog();

        if (socketList.length === 0) {
          originalLog(dim("  No active connections"));
          return;
        }

        // Clamp selection to an alive entry
        if (selectedIndex >= socketList.length) {
          selectedIndex = socketList.length - 1;
        }
        if (!socketList[selectedIndex]?.alive) {
          const next = nextAliveIndex(selectedIndex, -1);
          selectedIndex = socketList[next]?.alive
            ? next
            : nextAliveIndex(selectedIndex, 1);
        }

        // Build a lookup for live activity timestamps
        const activityMap = new Map<string, Millis>();
        for (const conn of Rooms.listActiveConnections()) {
          activityMap.set(entryKey(conn), conn.lastActiveAt);
        }

        for (let i = 0; i < socketList.length; i++) {
          const entry = socketList[i];
          if (!entry.alive) {
            originalLog(
              dim(
                `  ${entry.roomId} \u00B7 actor=${entry.actor} \u00B7 disconnected`
              )
            );
            continue;
          }
          const prefix = i === selectedIndex ? green("\u25B6 ") : "  ";
          const userId = entry.userId ?? dim("anonymous");
          const age = formatAge(entry.connectedAt);
          const lastActivity = activityMap.get(entryKey(entry));
          const blip = activityBlip(lastActivity);
          originalLog(
            `${prefix}${bold(entry.roomId)} ${dim("\u00B7")} actor=${entry.actor} ${dim("\u00B7")} ${userId} ${dim("\u00B7")} ${dim(age)}${blip}`
          );
        }
      };

      const switchToSockets = (): void => {
        activeTab = "sockets";
        selectedIndex = 0;
        refreshSocketList();
        renderSockets();
        repaintTimer = setInterval(() => renderSockets(), 1000);
      };

      const toggleMaintenance = (): void => {
        if (maintenanceRelease) {
          maintenanceRelease();
          maintenanceRelease = null;
        } else {
          const { promise, resolve } = Promise_withResolvers<void>();
          Rooms.enterGlobalMaintenance(promise);
          maintenanceRelease = resolve;
        }
      };

      // -- Keypresses --------------------------------------------------------
      process.stdout.write("\x1B[2J\x1B[H");
      originalLog(renderTabBar());
      originalLog(logsLegend());
      originalLog();
      if (ephemeralPath && options.verbose) {
        console.log(dim(`Ephemeral mode, using ${ephemeralPath}`));
      }

      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on("data", (data: Buffer) => {
        const ch = data.toString();

        // -- Global keys (work on any tab) -----------------------------------
        if (ch === "\x03" || ch === "q") {
          void server.stop(true).then(() => {
            Rooms.cleanup();
            process.exit(0);
          });
          return;
        }

        // Maintenance toggle
        if (ch === "m") {
          toggleMaintenance();
          if (activeTab === "sockets") {
            renderSockets();
          } else {
            // Repaint just the tab bar on the logs screen
            process.stdout.write("\x1B[s\x1B[H\x1B[2K");
            originalLog(renderTabBar());
            process.stdout.write("\x1B[u");
          }
          return;
        }

        // Tab switching
        if ((ch === "s" || ch === "\x1B[C") && activeTab !== "sockets") {
          switchToSockets();
          return;
        }
        if ((ch === "l" || ch === "\x1B[D") && activeTab !== "logs") {
          switchToLogs();
          return;
        }

        // -- Sockets tab keys ------------------------------------------------
        if (activeTab === "sockets") {
          if (ch === "\x1B[A") {
            selectedIndex = nextAliveIndex(selectedIndex, -1);
            renderSockets();
          } else if (ch === "\x1B[B") {
            selectedIndex = nextAliveIndex(selectedIndex, 1);
            renderSockets();
          } else if (ch === "k") {
            const entry = socketList[selectedIndex];
            if (entry?.alive) {
              Rooms.killConnection(entry.roomId, entry.actor);
              renderSockets();
            }
          } else if (ch === "r") {
            refreshSocketList();
            selectedIndex = 0;
            renderSockets();
          }
          return;
        }

        // -- Logs tab keys ---------------------------------------------------
        if (ch === "!") {
          if (rebootTimer !== null) {
            clearTimeout(rebootTimer);
            rebootTimer = null;
            void reboot();
          } else {
            console.log(
              "Simulating crash in 2.5s... (press ! again to crash now)"
            );
            rebootTimer = setTimeout(() => {
              rebootTimer = null;
              void reboot();
            }, 2500);
          }
        } else if (ch === "c") {
          logBuffer.length = 0;
          process.stdout.write("\x1B[2J\x1B[H");
          originalLog(renderTabBar());
          originalLog(logsLegend());
          originalLog();
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

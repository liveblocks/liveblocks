import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

export type LoadOptions = {
  baseUrl: string;
  rooms: number;
  clientsPerRoom: number;
  writersPerRoom: number;
  mutationRate: number;
  payloadBytes: number;
  rampSeconds: number;
  holdSeconds: number;
  reportPath: string;
  keepRooms: boolean;
};

export type LoadConfig = {
  runId: string;
  options: LoadOptions;
  publicKey: string;
  secretKey: string;
};

export const HELP = `Liveblocks Node SDK load test (Node >=24)

Required environment: LIVEBLOCKS_BASE_URL, LIVEBLOCKS_PUBLIC_KEY, LIVEBLOCKS_SECRET_KEY
Loads .env.local from the current directory without overriding environment variables.

Options (durations in seconds):
  --smoke                  Use 2 rooms, 5s ramp, 10s hold
  --rooms <n>              Default: 50
  --clients-per-room <n>   Default: 10
  --writers-per-room <n>   Default: 5
  --mutation-rate <n>      Mutations/second/writer; default: 1
  --payload-bytes <n>      ASCII payload bytes, excluding metadata; default: 256
  --ramp-seconds <n>       Default: 60 (0 connects without a ramp)
  --hold-seconds <n>       Default: 900
  --report <path>          Default: test-results/load-<run-id>.json
  --keep-rooms             Retain this run's rooms after cleanup
  --help                  Show help without contacting the server
`;

function numberOption(
  name: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  integer = false
): number {
  const n = value === undefined ? fallback : Number(value);
  if (
    value?.trim() === "" ||
    !Number.isFinite(n) ||
    n < minimum ||
    (integer && !Number.isSafeInteger(n))
  ) {
    throw new Error(
      `--${name} must be a finite ${integer ? "integer " : "number "}>= ${minimum}`
    );
  }
  return n;
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function parseConfig(
  args: string[],
  env: NodeJS.ProcessEnv = process.env
): LoadConfig | undefined {
  const { values } = parseArgs({
    args,
    options: {
      smoke: { type: "boolean" },
      rooms: { type: "string" },
      "clients-per-room": { type: "string" },
      "writers-per-room": { type: "string" },
      "mutation-rate": { type: "string" },
      "payload-bytes": { type: "string" },
      "ramp-seconds": { type: "string" },
      "hold-seconds": { type: "string" },
      report: { type: "string" },
      "keep-rooms": { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) return undefined;

  const rooms = numberOption(
    "rooms",
    values.rooms,
    values.smoke ? 2 : 50,
    1,
    true
  );
  const clientsPerRoom = numberOption(
    "clients-per-room",
    values["clients-per-room"],
    10,
    2,
    true
  );
  const writersPerRoom = numberOption(
    "writers-per-room",
    values["writers-per-room"],
    5,
    1,
    true
  );
  if (writersPerRoom > clientsPerRoom) {
    throw new Error("--writers-per-room cannot exceed --clients-per-room");
  }
  const mutationRate = numberOption(
    "mutation-rate",
    values["mutation-rate"],
    1,
    0.001
  );
  // Node timers have millisecond resolution. Faster rates cannot be generated reliably.
  if (mutationRate > 1000)
    throw new Error("--mutation-rate cannot exceed 1000");
  const payloadBytes = numberOption(
    "payload-bytes",
    values["payload-bytes"],
    256,
    0,
    true
  );
  const rampSeconds = numberOption(
    "ramp-seconds",
    values["ramp-seconds"],
    values.smoke ? 5 : 60,
    0
  );
  const holdSeconds = numberOption(
    "hold-seconds",
    values["hold-seconds"],
    values.smoke ? 10 : 900,
    0.001
  );
  if (
    !Number.isSafeInteger(rooms * clientsPerRoom) ||
    !Number.isSafeInteger(
      Math.ceil(holdSeconds * mutationRate) * rooms * writersPerRoom
    ) ||
    rampSeconds * 1000 > 2_147_483_647 ||
    holdSeconds * 1000 > 2_147_483_647
  ) {
    throw new Error("Requested workload exceeds safe counter/timer limits");
  }
  // Validate allocation before provisioning rooms.
  if (payloadBytes > 10_000_000)
    throw new Error("--payload-bytes cannot exceed 10000000");
  if (values.report?.trim() === "") throw new Error("--report cannot be empty");

  const url = new URL(requiredEnv(env, "LIVEBLOCKS_BASE_URL"));
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "LIVEBLOCKS_BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment"
    );
  }
  const runId = `${Date.now()}-${randomUUID()}`;
  return {
    runId,
    publicKey: requiredEnv(env, "LIVEBLOCKS_PUBLIC_KEY"),
    secretKey: requiredEnv(env, "LIVEBLOCKS_SECRET_KEY"),
    options: {
      baseUrl: url.origin,
      rooms,
      clientsPerRoom,
      writersPerRoom,
      mutationRate,
      payloadBytes,
      rampSeconds,
      holdSeconds,
      reportPath: resolve(values.report ?? `test-results/load-${runId}.json`),
      keepRooms: values["keep-rooms"] ?? false,
    },
  };
}

/** Return scheduled slots before the common hold deadline, including missed slots. */
export function scheduledCount(
  offsetMs: number,
  intervalMs: number,
  durationMs: number
): number {
  return Math.max(0, Math.ceil((durationMs - offsetMs) / intervalMs));
}

/** Skip overdue slots instead of issuing a catch-up burst. */
export function nextWriteAt(
  dueMs: number,
  nowMs: number,
  intervalMs: number
): number {
  return (
    dueMs +
    (Math.max(0, Math.floor((nowMs - dueMs) / intervalMs)) + 1) * intervalMs
  );
}

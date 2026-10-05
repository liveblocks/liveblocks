import { createClient, LiveMap } from "@liveblocks/client";
import type { Room } from "@liveblocks/client";
import { Liveblocks, LiveblocksError } from "@liveblocks/node";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";

import type { LoadConfig } from "./config.ts";
import { nextWriteAt, scheduledCount } from "./config.ts";
import { MillisecondHistogram, Observations } from "./metrics.ts";

type WriterValue = { sequence: number; sentAtMs: number; payload: string };
type Storage = { writers: LiveMap<string, WriterValue> };
type Presence = { clientId: string; runId: string };
type Phase =
  | "setup"
  | "provision"
  | "ramp"
  | "readiness"
  | "hold"
  | "drain"
  | "convergence"
  | "readback"
  | "cleanup"
  | "complete";
type Result = "running" | "passed" | "failed" | "inconclusive" | "interrupted";

type TestRoom = {
  id: string;
  index: number;
  attempted: boolean;
  created: boolean;
  deleted: boolean;
  expected: Map<string, WriterValue>;
  clients: TestClient[];
  convergenceVerified: boolean;
  readbackVerified: boolean;
};

type TestClient = {
  id: string;
  slot: number;
  room: Room<Presence, Storage>;
  leave: () => void;
  unsubs: (() => void)[];
  map?: LiveMap<string, WriterValue>;
  connected: boolean;
  connections: number;
  disconnects: number;
  closing: boolean;
  joinedAtMs: number;
  readyAfterMs: number | null;
  observations: Observations;
};

type Failure = {
  phase: Phase;
  kind: string;
  message: string;
  clientId?: string;
  httpStatus?: number;
};

function isWriterValue(value: unknown): value is WriterValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "sequence" in value &&
    typeof value.sequence === "number" &&
    Number.isSafeInteger(value.sequence) &&
    value.sequence >= 0 &&
    "sentAtMs" in value &&
    typeof value.sentAtMs === "number" &&
    Number.isFinite(value.sentAtMs) &&
    "payload" in value &&
    typeof value.payload === "string"
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

class LoadRun {
  readonly config: LoadConfig;
  readonly server: Liveblocks;
  readonly websocketClass: typeof WebSocket;
  readonly sockets = new Set<WebSocket>();
  readonly abort = new AbortController();
  readonly rooms: TestRoom[] = [];
  readonly clients: TestClient[] = [];
  readonly propagation = new MillisecondHistogram();
  readonly schedulingLag = new MillisecondHistogram();
  readonly loopDelay = monitorEventLoopDelay({ resolution: 20 });
  readonly startedAt = new Date().toISOString();
  readonly startedAtMs = performance.now();
  readonly initialCpu = process.cpuUsage();
  readonly phaseDurationsMs: Partial<Record<Phase, number>> = {};
  readonly failures: Failure[] = [];
  readonly failureCounts: Record<string, number> = {};
  readonly resourceSamples: {
    elapsedMs: number;
    cpuPercent: number;
    rssBytes: number;
    heapUsedBytes: number;
    eventLoopUtilization: number;
  }[] = [];
  readonly writeTimers = new Set<NodeJS.Timeout>();
  phase: Phase = "setup";
  phaseStartedAtMs = performance.now();
  result: Result = "running";
  interrupted = false;
  errorCount = 0;
  connected = 0;
  disconnects = 0;
  reconnects = 0;
  scheduledMutations = 0;
  performedMutations = 0;
  holdStartedAtMs: number | null = null;
  holdEndedAtMs: number | null = null;
  minConnectedDuringHold: number | null = null;
  peakRssBytes = 0;
  peakHeapUsedBytes = 0;
  lastCpu = process.cpuUsage();
  lastResourceAtMs = performance.now();
  lastUtilization = performance.eventLoopUtilization();
  reportWrite$ = Promise.resolve();
  reportCheckpointPending = false;

  constructor(config: LoadConfig) {
    this.config = config;
    this.server = new Liveblocks({
      baseUrl: config.options.baseUrl,
      secret: config.secretKey,
    });
    const sockets = this.sockets;
    // SDK leave() starts an asynchronous close handshake. Track the native
    // sockets so readback cannot become an eleventh connection to a full room.
    this.websocketClass = class extends WebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        sockets.add(this);
        this.addEventListener("close", () => sockets.delete(this), {
          once: true,
        });
      }
    };
  }

  redact(message: string): string {
    for (const key of [this.config.publicKey, this.config.secretKey]) {
      message = message
        .replaceAll(key, "[redacted]")
        .replaceAll(encodeURIComponent(key), "[redacted]");
    }
    return message.slice(0, 2000);
  }

  fail(kind: string, error: unknown, clientId?: string): void {
    this.errorCount++;
    this.failureCounts[kind] = (this.failureCounts[kind] ?? 0) + 1;
    if (this.failures.length < 100) {
      this.failures.push({
        phase: this.phase,
        kind,
        clientId,
        httpStatus: error instanceof LiveblocksError ? error.status : undefined,
        message: this.redact(
          error instanceof Error ? error.message : String(error)
        ),
      });
    }
  }

  setPhase(phase: Phase): void {
    const now = performance.now();
    this.phaseDurationsMs[this.phase] =
      (this.phaseDurationsMs[this.phase] ?? 0) + now - this.phaseStartedAtMs;
    this.phase = phase;
    this.phaseStartedAtMs = now;
    if (phase === "hold") {
      this.holdStartedAtMs = now;
      this.minConnectedDuringHold = this.connected;
    }
  }

  check(): void {
    this.abort.signal.throwIfAborted();
    if (this.errorCount)
      throw new Error("Aborting after a recorded load-test failure");
  }

  async waitUntil(
    predicate: () => boolean,
    timeoutMs: number,
    description: string
  ): Promise<void> {
    const deadline = performance.now() + timeoutMs;
    while (true) {
      this.check();
      if (predicate()) return;
      if (performance.now() >= deadline)
        throw new Error(`Timed out waiting for ${description}`);
      await sleep(
        Math.min(100, Math.max(1, deadline - performance.now())),
        undefined,
        { signal: this.abort.signal }
      );
    }
  }

  requestSignal(): AbortSignal {
    return AbortSignal.any([this.abort.signal, AbortSignal.timeout(15_000)]);
  }

  async provision(): Promise<void> {
    this.setPhase("provision");
    const { rooms, writersPerRoom, payloadBytes } = this.config.options;
    const payload = "x".repeat(payloadBytes);
    for (let index = 0; index < rooms; index++) {
      this.check();
      const expected = new Map<string, WriterValue>();
      const data: Record<string, WriterValue> = {};
      for (let slot = 0; slot < writersPerRoom; slot++) {
        const value = { sequence: 0, sentAtMs: 0, payload };
        data[`writer-${slot}`] = value;
        expected.set(`writer-${slot}`, value);
      }
      const room: TestRoom = {
        id: `sdk-load-${this.config.runId}-${index}`,
        index,
        attempted: true,
        created: false,
        deleted: false,
        expected,
        clients: [],
        convergenceVerified: false,
        readbackVerified: false,
      };
      this.rooms.push(room);
      await this.server.createRoom(
        room.id,
        {
          defaultAccesses: ["room:write"],
          metadata: { loadTestRunId: this.config.runId },
        },
        { signal: this.requestSignal() }
      );
      room.created = true;
      try {
        await this.server.initializeStorageDocument(
          room.id,
          {
            liveblocksType: "LiveObject",
            data: { writers: { liveblocksType: "LiveMap", data } },
          },
          { signal: this.requestSignal() }
        );
      } catch (error) {
        this.fail("initialize-storage", error);
        throw error;
      }
      // Preserve room ownership information if the process is later killed.
      await this.saveReport();
    }
  }

  connect(testRoom: TestRoom, slot: number, readback = false): TestClient {
    const id = `${testRoom.index}:${readback ? "readback" : slot}`;
    const client = createClient({
      publicApiKey: this.config.publicKey,
      baseUrl: this.config.options.baseUrl,
      polyfills: { WebSocket: this.websocketClass },
    });
    const { room, leave } = client.enterRoom<Presence, Storage>(testRoom.id, {
      autoConnect: false,
      initialPresence: { clientId: id, runId: this.config.runId },
      initialStorage: { writers: new LiveMap<string, WriterValue>() },
    });
    const state: TestClient = {
      id,
      slot,
      room,
      leave,
      unsubs: [],
      connected: false,
      connections: 0,
      disconnects: 0,
      closing: false,
      joinedAtMs: performance.now(),
      readyAfterMs: null,
      observations: new Observations(),
    };
    this.clients.push(state);
    if (!readback) testRoom.clients.push(state);
    state.unsubs.push(
      room.subscribe("status", (status) => {
        const connected = status === "connected";
        if (state.connected === connected) return;
        this.connected += connected ? 1 : -1;
        if (connected) {
          if (state.connections++) this.reconnects++;
        } else if (!state.closing) {
          this.disconnects++;
          state.disconnects++;
          if (this.phase === "hold") {
            this.fail(
              "disconnect",
              new Error(`Unexpected status ${status}`),
              id
            );
          }
        }
        state.connected = connected;
        if (this.phase === "hold") {
          this.minConnectedDuringHold = Math.min(
            this.minConnectedDuringHold ?? this.connected,
            this.connected
          );
        }
      })
    );
    state.unsubs.push(
      room.subscribe("error", (error) => {
        if (!state.closing) this.fail("client", error, id);
      })
    );
    // Attach a rejection handler immediately: readiness failures must not become
    // unhandled rejections, and teardown must not wait on unresolved storage loads.
    const storage$ = room.getStorage().then(({ root }) => {
      if (state.closing) return;
      const map = root.get("writers");
      if (!(map instanceof LiveMap))
        throw new Error("Storage is missing the writers LiveMap");
      state.map = map;
      state.unsubs.push(
        room.subscribe(
          map,
          (updates) => {
            if (state.closing || this.holdStartedAtMs === null || readback)
              return;
            for (const update of updates) {
              if (
                update.type !== "LiveMap" ||
                update.source.origin !== "remote"
              )
                continue;
              for (const key of Object.keys(update.updates)) {
                // Each writer owns its slot; its optimistic local echo is never latency.
                if (
                  slot < this.config.options.writersPerRoom &&
                  key === `writer-${slot}`
                )
                  continue;
                const value = map.get(key);
                if (!isWriterValue(value)) {
                  this.fail(
                    "storage",
                    new Error(`Invalid value for ${key}`),
                    id
                  );
                  continue;
                }
                if (
                  value.sequence > 0 &&
                  state.observations.observe(key, value.sequence)
                ) {
                  this.propagation.record(performance.now() - value.sentAtMs);
                }
              }
            }
          },
          { isDeep: true }
        )
      );
    });
    void storage$.catch((error: unknown) => {
      if (!state.closing) this.fail("storage", error, id);
    });
    room.connect();
    return state;
  }

  ready(state: TestClient): boolean {
    if (
      !state.connected ||
      !state.map ||
      state.room.getStorageStatus() !== "synchronized"
    )
      return false;
    const { clientsPerRoom } = this.config.options;
    const others = state.room.getOthers();
    const peerIds = new Set(
      others
        .filter((other) => other.presence.runId === this.config.runId)
        .map((other) => other.presence.clientId)
    );
    const roomIndex = state.id.split(":")[0];
    for (let slot = 0; slot < clientsPerRoom; slot++) {
      if (slot !== state.slot && !peerIds.has(`${roomIndex}:${slot}`))
        return false;
    }
    if (
      others.length !== clientsPerRoom - 1 ||
      state.map.size !== this.config.options.writersPerRoom
    )
      return false;
    state.readyAfterMs ??= performance.now() - state.joinedAtMs;
    return true;
  }

  async ramp(): Promise<void> {
    this.setPhase("ramp");
    const { rooms, clientsPerRoom, rampSeconds } = this.config.options;
    const count = rooms * clientsPerRoom;
    const start = performance.now();
    for (let index = 0; index < count; index++) {
      const delay =
        start +
        (count > 1 ? index / (count - 1) : 0) * rampSeconds * 1000 -
        performance.now();
      if (delay > 0)
        await sleep(delay, undefined, { signal: this.abort.signal });
      this.check();
      const testRoom = this.rooms[Math.floor(index / clientsPerRoom)];
      if (!testRoom) throw new Error("Missing provisioned room");
      this.connect(testRoom, index % clientsPerRoom);
    }
    this.setPhase("readiness");
    await this.waitUntil(
      () => {
        // Evaluate every client even if an earlier client isn't ready yet.
        let ready = true;
        for (const state of this.clients) if (!this.ready(state)) ready = false;
        return ready;
      },
      60_000,
      "all clients to connect, load storage, and see their peers"
    );
  }

  scheduleWriter(
    testRoom: TestRoom,
    state: TestClient,
    start: number,
    end: number
  ): void {
    const { mutationRate } = this.config.options;
    const interval = 1000 / mutationRate;
    const offset = Math.random() * interval;
    this.scheduledMutations += scheduledCount(offset, interval, end - start);
    const key = `writer-${state.slot}`;
    const schedule = (due: number): void => {
      if (due >= end) return;
      const timer = setTimeout(
        () => {
          this.writeTimers.delete(timer);
          const now = performance.now();
          if (
            this.phase !== "hold" ||
            this.abort.signal.aborted ||
            now >= end ||
            this.errorCount
          )
            return;
          this.schedulingLag.record(Math.max(0, now - due));
          try {
            if (!state.connected || !state.map)
              throw new Error("Writer is not connected with loaded storage");
            const previous = testRoom.expected.get(key);
            if (!previous) throw new Error("Missing writer slot");
            const value = {
              sequence: previous.sequence + 1,
              sentAtMs: now,
              payload: previous.payload,
            };
            state.map.set(key, value);
            testRoom.expected.set(key, value);
            this.performedMutations++;
          } catch (error) {
            this.fail("mutation", error, state.id);
            return;
          }
          schedule(nextWriteAt(due, performance.now(), interval));
        },
        Math.max(1, Math.ceil(due - performance.now()))
      );
      this.writeTimers.add(timer);
    };
    schedule(start + offset);
  }

  stopWrites(): void {
    for (const timer of this.writeTimers) clearTimeout(timer);
    this.writeTimers.clear();
    if (this.holdStartedAtMs !== null && this.holdEndedAtMs === null)
      this.holdEndedAtMs = performance.now();
  }

  async holdAndVerify(): Promise<void> {
    this.setPhase("hold");
    const start = this.phaseStartedAtMs;
    const end = start + this.config.options.holdSeconds * 1000;
    for (const testRoom of this.rooms) {
      for (const state of testRoom.clients.slice(
        0,
        this.config.options.writersPerRoom
      )) {
        this.scheduleWriter(testRoom, state, start, end);
      }
    }
    await this.waitUntil(
      () => performance.now() >= end,
      end - start + 1000,
      "the hold deadline"
    );
    this.stopWrites();
    this.setPhase("drain");
    await this.waitUntil(
      () =>
        this.clients.every(
          (state) =>
            state.connected && state.room.getStorageStatus() === "synchronized"
        ),
      30_000,
      "storage synchronization"
    );
    this.setPhase("convergence");
    await this.waitUntil(
      () =>
        this.rooms.every((room) =>
          room.clients.every((state) => this.matches(room, state))
        ),
      30_000,
      "final storage convergence"
    );
    for (const room of this.rooms) room.convergenceVerified = true;
    this.closeClients();
    await this.waitUntil(
      () => this.sockets.size === 0,
      15_000,
      "original WebSocket close handshakes"
    );
    this.setPhase("readback");
    for (const testRoom of this.rooms) {
      this.check();
      const reader = this.connect(testRoom, -1, true);
      await this.waitUntil(
        () =>
          reader.connected &&
          reader.room.getStorageStatus() === "synchronized" &&
          this.matches(testRoom, reader),
        30_000,
        `fresh-client readback for room ${testRoom.index}`
      );
      testRoom.readbackVerified = true;
      this.closeClient(reader);
    }
    this.check();
    this.result =
      this.scheduledMutations > 0 &&
      this.performedMutations / this.scheduledMutations >= 0.95
        ? "passed"
        : "inconclusive";
  }

  matches(testRoom: TestRoom, state: TestClient): boolean {
    if (!state.map || state.map.size !== testRoom.expected.size) return false;
    for (const [key, expected] of testRoom.expected) {
      const actual = state.map.get(key);
      if (
        !isWriterValue(actual) ||
        actual.sequence !== expected.sequence ||
        actual.sentAtMs !== expected.sentAtMs ||
        actual.payload !== expected.payload
      )
        return false;
    }
    return true;
  }

  closeClient(state: TestClient): void {
    if (state.closing) return;
    state.closing = true;
    for (const unsub of state.unsubs.splice(0)) unsub();
    if (state.connected) this.connected--;
    state.connected = false;
    state.leave();
  }

  closeClients(): void {
    for (const state of this.clients) {
      try {
        this.closeClient(state);
      } catch (error) {
        this.fail("cleanup", error, state.id);
      }
    }
  }

  async cleanup(): Promise<void> {
    this.setPhase("cleanup");
    this.stopWrites();
    this.closeClients();
    // Cleanup ignores the interrupted run's abort signal, including while
    // waiting for sockets to close. Bound this independently of HTTP cleanup.
    const closeDeadline = performance.now() + 15_000;
    while (this.sockets.size && performance.now() < closeDeadline)
      await sleep(25);
    if (this.sockets.size) {
      this.fail(
        "cleanup",
        new Error(`${this.sockets.size} WebSocket close handshakes timed out`)
      );
    }
    if (this.config.options.keepRooms) return;
    for (const room of this.rooms) {
      if (!room.attempted) continue;
      try {
        // A create response can be lost after the server committed the room.
        // Verify ownership before deleting an uncertain creation.
        if (!room.created) {
          const remote = await this.server.getRoom(room.id, {
            signal: AbortSignal.timeout(15_000),
          });
          if (remote.metadata.loadTestRunId !== this.config.runId) {
            throw new Error(`Refusing to delete unowned room ${room.id}`);
          }
          room.created = true;
        }
        await this.server.deleteRoom(room.id, {
          signal: AbortSignal.timeout(15_000),
        });
        room.deleted = true;
      } catch (error) {
        if (isNotFound(error)) room.deleted = true;
        else this.fail("cleanup", error);
      }
    }
  }

  sampleResources(): void {
    const now = performance.now();
    const cpu = process.cpuUsage();
    const memory = process.memoryUsage();
    const utilization = performance.eventLoopUtilization();
    this.peakRssBytes = Math.max(
      this.peakRssBytes,
      memory.rss,
      process.resourceUsage().maxRSS * 1024
    );
    this.peakHeapUsedBytes = Math.max(this.peakHeapUsedBytes, memory.heapUsed);
    this.resourceSamples.push({
      elapsedMs: now - this.startedAtMs,
      cpuPercent:
        ((cpu.user + cpu.system - this.lastCpu.user - this.lastCpu.system) /
          Math.max(1, (now - this.lastResourceAtMs) * 1000)) *
        100,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      eventLoopUtilization: performance.eventLoopUtilization(
        utilization,
        this.lastUtilization
      ).utilization,
    });
    // Preserve bounded memory even for multi-hour runs.
    if (this.resourceSamples.length > 300) this.resourceSamples.shift();
    this.lastCpu = cpu;
    this.lastResourceAtMs = now;
    this.lastUtilization = utilization;
  }

  progress(): void {
    this.sampleResources();
    const latency = this.propagation.snapshot();
    console.log(
      `[${this.phase}] connected=${this.connected}/${this.config.options.rooms * this.config.options.clientsPerRoom} mutations=${this.performedMutations}/${this.scheduledMutations} propagation-p95=${latency.p95Ms?.toFixed(1) ?? "n/a"}ms errors=${this.errorCount} rss=${Math.round(this.peakRssBytes / 1024 ** 2)}MiB`
    );
    // Keep useful connection-phase evidence if Turbo or the process is killed.
    if (!this.reportCheckpointPending) {
      this.reportCheckpointPending = true;
      void this.saveReport()
        .catch((error: unknown) => this.fail("report", error))
        .finally(() => {
          this.reportCheckpointPending = false;
        });
    }
  }

  report() {
    const cpu = process.cpuUsage(this.initialCpu);
    const holdMs =
      this.holdStartedAtMs === null
        ? 0
        : (this.holdEndedAtMs ?? performance.now()) - this.holdStartedAtMs;
    return {
      schemaVersion: 1,
      runId: this.config.runId,
      startedAt: this.startedAt,
      finishedAt: this.result === "running" ? null : new Date().toISOString(),
      result: this.result,
      phase: this.phase,
      configuration: this.config.options,
      elapsedMs: performance.now() - this.startedAtMs,
      phaseDurationsMs: this.phaseDurationsMs,
      connections: {
        target: this.config.options.rooms * this.config.options.clientsPerRoom,
        connected: this.connected,
        minConnectedDuringHold: this.minConnectedDuringHold,
        disconnects: this.disconnects,
        reconnects: this.reconnects,
      },
      mutations: {
        scheduled: this.scheduledMutations,
        performed: this.performedMutations,
        performedFraction: this.scheduledMutations
          ? this.performedMutations / this.scheduledMutations
          : null,
        targetPerSecond:
          this.config.options.rooms *
          this.config.options.writersPerRoom *
          this.config.options.mutationRate,
        achievedPerSecond:
          holdMs > 0 ? this.performedMutations / (holdMs / 1000) : null,
        holdMs,
      },
      propagation: {
        ...this.propagation.snapshot(),
        skippedSequenceObservations: this.clients.reduce(
          (n, state) => n + state.observations.skipped,
          0
        ),
      },
      schedulingLag: this.schedulingLag.snapshot(),
      generator: {
        cpuUserMs: cpu.user / 1000,
        cpuSystemMs: cpu.system / 1000,
        peakRssBytes: this.peakRssBytes,
        peakHeapUsedBytes: this.peakHeapUsedBytes,
        eventLoopDelay: {
          count: this.loopDelay.count,
          p95Ms: this.loopDelay.count
            ? this.loopDelay.percentile(95) / 1e6
            : null,
          p99Ms: this.loopDelay.count
            ? this.loopDelay.percentile(99) / 1e6
            : null,
          maxMs: this.loopDelay.count ? this.loopDelay.max / 1e6 : null,
        },
        resourceSamples: this.resourceSamples,
      },
      errorCount: this.errorCount,
      failureCounts: this.failureCounts,
      errors: this.failures,
      errorsTruncated: this.errorCount > this.failures.length,
      rooms: this.rooms.map((room) => ({
        id: room.id,
        created: room.created,
        deleted: room.deleted,
        convergenceVerified: room.convergenceVerified,
        readbackVerified: room.readbackVerified,
        finalSequences: Object.fromEntries(
          [...room.expected].map(([key, value]) => [key, value.sequence])
        ),
        clients: room.clients.map((state) => ({
          id: state.id,
          readyAfterMs: state.readyAfterMs,
          connections: state.connections,
          disconnects: state.disconnects,
        })),
      })),
    };
  }

  saveReport(): Promise<void> {
    const path = this.config.options.reportPath;
    const temporaryPath = `${path}.${this.config.runId}.tmp`;
    const contents = `${JSON.stringify(this.report(), null, 2)}\n`;
    // Provisioning, progress, and final reports share an atomic-write queue.
    const write$ = this.reportWrite$.then(async () => {
      await writeFile(temporaryPath, contents);
      await rename(temporaryPath, path);
    });
    this.reportWrite$ = write$.catch(() => {});
    return write$;
  }

  async run(): Promise<number> {
    // Validate the report destination before making any network requests.
    await mkdir(dirname(this.config.options.reportPath), { recursive: true });
    await this.saveReport();
    const interrupt = (signal: NodeJS.Signals): void => {
      if (this.interrupted) return;
      this.interrupted = true;
      console.log(
        `Received ${signal}; stopping writes and cleaning up this run.`
      );
      this.abort.abort(new Error(`Interrupted by ${signal}`));
    };
    const onSigint = (): void => interrupt("SIGINT");
    const onSigterm = (): void => interrupt("SIGTERM");
    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);
    this.loopDelay.enable();
    const progress = setInterval(() => this.progress(), 5000);
    try {
      console.log(
        `Load test ${this.config.runId}: ${this.config.options.baseUrl}`
      );
      await this.provision();
      await this.ramp();
      await this.holdAndVerify();
    } catch (error) {
      if (!this.errorCount)
        this.fail(this.interrupted ? "interruption" : this.phase, error);
      this.result = this.interrupted ? "interrupted" : "failed";
    } finally {
      await this.cleanup();
      clearInterval(progress);
      this.sampleResources();
      this.loopDelay.disable();
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
      if (this.errorCount && !this.interrupted) this.result = "failed";
      if (this.interrupted) this.result = "interrupted";
      this.setPhase("complete");
      await this.saveReport();
    }
    console.log(
      `${this.result.toUpperCase()}: report saved to ${this.config.options.reportPath}`
    );
    for (const error of this.failures.slice(0, 5))
      console.error(
        `${error.kind}${error.httpStatus ? ` (HTTP ${error.httpStatus})` : ""}: ${error.message}`
      );
    return this.result === "passed"
      ? 0
      : this.result === "inconclusive"
        ? 2
        : this.result === "interrupted"
          ? 130
          : 1;
  }
}

export async function runLoad(config: LoadConfig): Promise<number> {
  return new LoadRun(config).run();
}

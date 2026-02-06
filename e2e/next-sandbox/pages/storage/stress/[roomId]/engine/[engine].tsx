import type { Lson, LsonObject } from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { Row, styles, useRenderCount } from "../../../../../utils";
import Button from "../../../../../utils/Button";
import { createLiveblocksClient } from "../../../../../utils/createClient";

const client = createLiveblocksClient({
  authEndpoint: "/api/auth/access-token",
  largeMessageStrategy: "split",
});

// Storage starts empty, can grow arbitrarily
type Storage = LsonObject;

const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useMutation,
  useRedo,
  useRoom,
  useStatus,
  useStorage,
  useSyncStatus,
  useUndo,
} = createRoomContext<never, Storage>(client);

// JSON.stringify replacer to handle Map objects (LiveMap.toImmutable() returns Map)
function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  return value;
}

// Deterministic JSON stringify with sorted keys (for consistent hashing)
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (_key, value: unknown) => {
    if (value instanceof Map) {
      // Sort map entries by key
      const sorted = [...(value as Map<string, unknown>).entries()].sort(
        ([a], [b]) => a.localeCompare(b)
      );
      return Object.fromEntries(sorted);
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Sort object keys
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// Simple hash function for quick comparison
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

type LiveNode = LiveObject<LsonObject> | LiveList<Lson> | LiveMap<string, Lson>;

// Create a random tree of given depth/breadth
function createRandomTree(depth: number, breadth: number): LiveNode {
  const kind = randomInt(3); // 0=LiveObject, 1=LiveList, 2=LiveMap

  if (kind === 0) {
    const init: Record<string, Lson> = {};
    for (let i = 0; i < breadth; i++) {
      const key = `k_${randomString(6)}`;
      if (depth > 0 && Math.random() > 0.3) {
        init[key] = createRandomTree(depth - 1, breadth);
      } else {
        init[key] = randomString(12);
      }
    }
    return new LiveObject(init);
  } else if (kind === 1) {
    const init: Lson[] = [];
    for (let i = 0; i < breadth; i++) {
      if (depth > 0 && Math.random() > 0.3) {
        init.push(createRandomTree(depth - 1, breadth));
      } else {
        init.push(randomString(12));
      }
    }
    return new LiveList(init);
  } else {
    const init: [string, Lson][] = [];
    for (let i = 0; i < breadth; i++) {
      const key = `m_${randomString(6)}`;
      if (depth > 0 && Math.random() > 0.3) {
        init.push([key, createRandomTree(depth - 1, breadth)]);
      } else {
        init.push([key, randomString(12)]);
      }
    }
    return new LiveMap(init);
  }
}

// Collect all attachment points in the tree
type AttachmentPoint =
  | { type: "object"; node: LiveObject<LsonObject> }
  | { type: "list"; node: LiveList<Lson> }
  | { type: "map"; node: LiveMap<string, Lson> };

function collectAttachmentPoints(
  root: LiveObject<LsonObject>
): AttachmentPoint[] {
  const points: AttachmentPoint[] = [{ type: "object", node: root }];

  function visit(value: unknown) {
    if (value instanceof LiveObject) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      points.push({ type: "object", node: value as LiveObject<LsonObject> });
      for (const child of Object.values(value.toObject())) {
        visit(child);
      }
    } else if (value instanceof LiveList) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      points.push({ type: "list", node: value as LiveList<Lson> });
      for (const item of value) {
        visit(item);
      }
    } else if (value instanceof LiveMap) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      points.push({ type: "map", node: value as LiveMap<string, Lson> });
      for (const [, v] of value) {
        visit(v);
      }
    }
  }

  for (const child of Object.values(root.toObject())) {
    visit(child);
  }

  return points;
}

// Size configurations with labels
const SIZES = {
  S: { depth: 1, breadth: 2, label: "1×2" },
  M: { depth: 2, breadth: 2, label: "2×2" },
  L: { depth: 2, breadth: 3, label: "2×3" },
  XL: { depth: 3, breadth: 3, label: "3×3" },
  XXL: { depth: 3, breadth: 4, label: "3×4" },
  XXXL: { depth: 4, breadth: 4, label: "4×4" },
} as const;

const SHRINK_COUNTS = {
  S: { count: 1, label: "1" },
  M: { count: 3, label: "3" },
  L: { count: 8, label: "8" },
  XL: { count: 20, label: "20" },
  XXL: { count: 50, label: "50" },
  XXXL: { count: 100, label: "100" },
} as const;

const CHANGE_COUNTS = {
  S: { count: 1, label: "1" },
  M: { count: 5, label: "5" },
  L: { count: 15, label: "15" },
  XL: { count: 40, label: "40" },
  XXL: { count: 100, label: "100" },
  XXXL: { count: 250, label: "250" },
} as const;

export default function StressTestRoom() {
  const router = useRouter();
  const { roomId, engine: engineStr } = router.query;

  // Wait for router to be ready
  if (!router.isReady || typeof roomId !== "string") {
    return <div>Loading...</div>;
  }

  const engine = engineStr === "1" ? 1 : engineStr === "2" ? 2 : undefined;
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{}}
      engine={engine}
    >
      <Sandbox roomId={roomId} />
    </RoomProvider>
  );
}

function Sandbox({ roomId }: { roomId: string }) {
  const room = useRoom();
  const renderCount = useRenderCount();
  const status = useStatus();
  const syncStatus = useSyncStatus();
  const immutable = useStorage((root) => root);
  const [repeat, setRepeat] = useState(10);
  const [showData, setShowData] = useState(false);
  const [showHash, setShowHash] = useState(true);
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const grow = useMutation(
    ({ storage }, size: { depth: number; breadth: number }, times: number) => {
      const points = collectAttachmentPoints(storage);
      for (let t = 0; t < times; t++) {
        const point = points[randomInt(points.length)];
        const newTree = createRandomTree(size.depth, size.breadth);
        const key = `k_${randomString(6)}`;

        if (point.type === "object") {
          point.node.set(key, newTree);
        } else if (point.type === "list") {
          point.node.push(newTree);
        } else {
          point.node.set(key, newTree);
        }
      }
    },
    []
  );

  const shrink = useMutation(({ storage }, count: number, times: number) => {
    const points = collectAttachmentPoints(storage);
    const totalDeletes = count * times;
    const maxAttempts = totalDeletes * 3; // Allow some retries for empty points

    let deleted = 0;
    for (let attempt = 0; attempt < maxAttempts && deleted < totalDeletes; attempt++) {
      const point = points[randomInt(points.length)];

      if (point.type === "object") {
        const keys = Object.keys(point.node.toObject());
        if (keys.length > 0) {
          point.node.delete(keys[randomInt(keys.length)]);
          deleted++;
        }
      } else if (point.type === "list") {
        if (point.node.length > 0) {
          point.node.delete(randomInt(point.node.length));
          deleted++;
        }
      } else {
        const keys = Array.from(point.node.keys());
        if (keys.length > 0) {
          point.node.delete(keys[randomInt(keys.length)]);
          deleted++;
        }
      }
    }
  }, []);

  const change = useMutation(({ storage }, count: number, times: number) => {
    const points = collectAttachmentPoints(storage);
    for (let t = 0; t < times; t++) {
      for (let i = 0; i < count; i++) {
        const point = points[randomInt(points.length)];

        if (point.type === "object") {
          const keys = Object.keys(point.node.toObject());
          if (keys.length > 0 && Math.random() < 0.5) {
            // Change existing value to a string
            const key = keys[randomInt(keys.length)];
            const val = point.node.get(key);
            if (typeof val === "string") {
              point.node.set(key, randomString(12));
            }
          } else {
            // Add a new string key
            point.node.set(`k_${randomString(6)}`, randomString(12));
          }
        } else if (point.type === "list") {
          if (point.node.length > 0 && Math.random() < 0.5) {
            const idx = randomInt(point.node.length);
            const val = point.node.get(idx);
            if (typeof val === "string") {
              point.node.set(idx, randomString(12));
            }
          } else {
            point.node.push(randomString(12));
          }
        } else {
          const keys = Array.from(point.node.keys());
          if (keys.length > 0 && Math.random() < 0.5) {
            const key = keys[randomInt(keys.length)];
            const val = point.node.get(key);
            if (typeof val === "string") {
              point.node.set(key, randomString(12));
            }
          } else {
            point.node.set(`m_${randomString(6)}`, randomString(12));
          }
        }
      }
    }
  }, []);

  const clear = useMutation(({ storage }) => {
    for (const key of Object.keys(storage.toObject())) {
      storage.delete(key);
    }
  }, []);

  if (immutable === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage ›{" "}
        <Link href={`/storage/stress/${encodeURIComponent(roomId)}`}>
          Stress Test
        </Link>{" "}
        › <code style={{ fontSize: "14px" }}>{roomId}</code>
      </h3>

      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            margin: "8px 0",
            gap: "4px",
            alignItems: "center",
          }}
        >
          <span style={{ width: "60px" }}>Repeat:</span>
          {[1, 3, 5, 10, 100].map((n) => (
            <button
              key={n}
              onClick={() => setRepeat(n)}
              style={{
                padding: "4px 12px",
                fontWeight: repeat === n ? "bold" : "normal",
                background: repeat === n ? "#333" : "#eee",
                color: repeat === n ? "#fff" : "#333",
                border: "1px solid #999",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            margin: "8px 0",
            gap: "4px",
            alignItems: "center",
          }}
        >
          <span style={{ width: "60px" }}>Grow:</span>
          {(Object.keys(SIZES) as (keyof typeof SIZES)[]).map((size) => (
            <Button
              key={size}
              id={`grow-${size}`}
              onClick={() => grow(SIZES[size], repeat)}
              subtitle={SIZES[size].label}
            >
              {size}
            </Button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            margin: "8px 0",
            gap: "4px",
            alignItems: "center",
          }}
        >
          <span style={{ width: "60px" }}>Shrink:</span>
          {(Object.keys(SHRINK_COUNTS) as (keyof typeof SHRINK_COUNTS)[]).map(
            (size) => (
              <Button
                key={size}
                id={`shrink-${size}`}
                onClick={() => shrink(SHRINK_COUNTS[size].count, repeat)}
                subtitle={SHRINK_COUNTS[size].label}
              >
                {size}
              </Button>
            )
          )}
        </div>
        <div
          style={{
            display: "flex",
            margin: "8px 0",
            gap: "4px",
            alignItems: "center",
          }}
        >
          <span style={{ width: "60px" }}>Change:</span>
          {(Object.keys(CHANGE_COUNTS) as (keyof typeof CHANGE_COUNTS)[]).map(
            (size) => (
              <Button
                key={size}
                id={`change-${size}`}
                onClick={() => change(CHANGE_COUNTS[size].count, repeat)}
                subtitle={CHANGE_COUNTS[size].label}
              >
                {size}
              </Button>
            )
          )}
        </div>
        <div
          style={{
            display: "flex",
            margin: "8px 0",
            gap: "4px",
            alignItems: "center",
          }}
        >
          <span style={{ width: "60px" }}></span>
          <Button id="undo" enabled={canUndo} onClick={undo}>
            Undo
          </Button>
          <Button id="redo" enabled={canRedo} onClick={redo}>
            Redo
          </Button>
          <Button id="clear" onClick={clear}>
            Clear
          </Button>
          <Button id="reconnect" onClick={() => room.reconnect()}>
            Reconnect
          </Button>
          <Link href={`/storage/stress/${encodeURIComponent(roomId)}`}>
            <Button id="leave" onClick={() => {}}>
              Leave
            </Button>
          </Link>
        </div>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="socketStatus" name="WebSocket status" value={status} />
          <Row
            id="syncStatus"
            name="Sync status"
            value={syncStatus}
            style={{
              color: syncStatus !== "synchronized" ? "orange" : "green",
            }}
          />
        </tbody>
      </table>

      <h4>Storage</h4>
      <div style={{ marginBottom: "8px" }}>
        <label style={{ marginRight: "16px" }}>
          <input
            type="checkbox"
            checked={showHash}
            onChange={(e) => setShowHash(e.target.checked)}
          />{" "}
          Show hash
        </label>
        <label>
          <input
            type="checkbox"
            checked={showData}
            onChange={(e) => setShowData(e.target.checked)}
          />{" "}
          Show data
        </label>
      </div>
      {showHash ? (
        <div style={{ marginBottom: "8px" }}>
          <code
            style={{ fontSize: "12px", background: "#eee", padding: "2px 6px" }}
          >
            {(() => {
              const str = stableStringify(immutable);
              return `${simpleHash(str)} (${formatSize(str.length)})`;
            })()}
          </code>
        </div>
      ) : null}
      {showData ? (
        <pre
          id="storage-output"
          style={{
            fontSize: "10px",
            background: "#f5f5f5",
            padding: "8px",
            overflow: "auto",
            maxHeight: "600px",
            border: "1px solid #ddd",
          }}
        >
          {JSON.stringify(immutable, mapReplacer, 2)}
        </pre>
      ) : null}
    </div>
  );
}

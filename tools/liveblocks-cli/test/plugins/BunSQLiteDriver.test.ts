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

import fs from "node:fs";
import os from "node:os";
import stdPath from "node:path";

import type { NodeMap } from "@liveblocks/core";
import { CrdtType } from "@liveblocks/core";
import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import { BunSQLiteDriver } from "~/dev-server/db/BunSQLiteDriver";

import { generateFullTestSuite } from "./_generateFullTestSuite";

/** Directly insert raw nodes into SQLite, bypassing driver constraints */
function initBunSQLite(dbPath: string, rawNodes: NodeMap): void {
  const db = new Database(dbPath);

  // Disable FK constraints during test setup to allow inserting nodes in any
  // order, or with missing parents (to test recovery scenarios)
  db.run("PRAGMA foreign_keys = OFF");

  for (const [id, node] of rawNodes) {
    const parentId = id === "root" ? null : (node.parentId ?? null);
    const parentKey = id === "root" ? null : (node.parentKey ?? null);
    const jdata =
      node.type === CrdtType.OBJECT ||
      node.type === CrdtType.REGISTER ||
      node.type === CrdtType.TEXT ||
      node.type === CrdtType.FILE
        ? JSON.stringify(node.data)
        : null;
    const version = node.type === CrdtType.TEXT ? node.version : null;

    db.run(
      "INSERT INTO nodes (id, type, parent_id, parent_key, jdata, version) VALUES (?, ?, ?, ?, ?, ?)",
      [id, node.type, parentId, parentKey, jdata, version]
    );
  }

  db.close();
}

describe("Bun SQLite driver", () => {
  generateFullTestSuite({
    name: "bun-sqlite",
    runTest: async (options, testFn) => {
      const tmpdir = fs.mkdtempSync(
        stdPath.join(os.tmpdir(), "lb-sqlite-test-")
      );
      const dbPath = stdPath.join(tmpdir, "my-test-room.db");
      const driver = new BunSQLiteDriver(dbPath);

      if (options.initialNodes) {
        initBunSQLite(dbPath, options.initialNodes);
      }

      try {
        await testFn(driver);
      } finally {
        driver.close();
      }
    },
  });
});

describe("Bun SQLite driver LiveText history", () => {
  test("stores, purges, and deletes LiveText operation history", () => {
    const tmpdir = fs.mkdtempSync(stdPath.join(os.tmpdir(), "lb-sqlite-test-"));
    const dbPath = stdPath.join(tmpdir, "my-test-room.db");
    const driver = new BunSQLiteDriver(dbPath);

    try {
      driver.set_child(
        "0:1",
        {
          type: CrdtType.TEXT,
          parentId: "root",
          parentKey: "text",
          data: [["Hello"]],
          version: 0,
        },
        true
      );

      driver.append_live_text_history({
        nodeId: "0:1",
        baseVersion: 0,
        version: 1,
        opId: "op:1",
        ops: [{ type: "insert", index: 5, text: "!" }],
      });
      driver.append_live_text_history({
        nodeId: "0:1",
        baseVersion: 1,
        version: 2,
        opId: "op:2",
        ops: [{ type: "delete", index: 0, length: 1 }],
      });

      expect(driver.get_live_text_history_by_op_id("0:1", "op:1")).toEqual({
        nodeId: "0:1",
        baseVersion: 0,
        version: 1,
        opId: "op:1",
        ops: [{ type: "insert", index: 5, text: "!" }],
      });
      expect(driver.get_live_text_history_since("0:1", 0)).toHaveLength(2);

      driver.purge_live_text_history_before("0:1", 2);
      expect(driver.get_live_text_history_since("0:1", 0)).toEqual([
        {
          nodeId: "0:1",
          baseVersion: 1,
          version: 2,
          opId: "op:2",
          ops: [{ type: "delete", index: 0, length: 1 }],
        },
      ]);

      driver.delete_node("0:1");
      expect(driver.get_live_text_history_since("0:1", 0)).toEqual([]);
    } finally {
      driver.close();
    }
  });
});

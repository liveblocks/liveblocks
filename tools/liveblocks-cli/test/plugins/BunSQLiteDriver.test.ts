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
import { describe } from "bun:test";

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
      node.type === CrdtType.OBJECT || node.type === CrdtType.REGISTER
        ? JSON.stringify(node.data)
        : null;

    db.run(
      "INSERT INTO nodes (id, type, parent_id, parent_key, jdata) VALUES (?, ?, ?, ?, ?)",
      [id, node.type, parentId, parentKey, jdata]
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

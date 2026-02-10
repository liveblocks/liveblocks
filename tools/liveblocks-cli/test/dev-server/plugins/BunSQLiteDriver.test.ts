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
import { Database } from "bun:sqlite";
import { describe } from "bun:test";

import { BunSQLiteDriver } from "../../../src/dev-server/plugins/BunSQLiteDriver";
import { generateFullTestSuite } from "./_generateFullTestSuite";

/** Directly write raw nodes to Bun SQLite, bypassing driver */
function initBunSQLite(dbPath: string, rawNodes: NodeMap): void {
  const db = new Database(dbPath);
  for (const [nodeId, node] of rawNodes) {
    db.run("INSERT INTO nodes (node_id, crdt_json) VALUES (?, ?)", [
      nodeId,
      JSON.stringify(node),
    ]);
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

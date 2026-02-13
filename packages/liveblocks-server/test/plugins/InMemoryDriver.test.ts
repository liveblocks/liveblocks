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

import type { NodeMap } from "@liveblocks/core";

import { InMemoryDriver } from "~/plugins/InMemoryDriver";

import { generateFullTestSuite } from "./_generateFullTestSuite";

/** Directly write raw nodes to in-memory storage, bypassing driver */
function initInMemory(driver: InMemoryDriver, rawNodes: NodeMap): void {
  // Access internal _nodes Map directly
  const internalNodes = (driver as unknown as { _nodes: NodeMap })._nodes;
  for (const [id, node] of rawNodes) {
    internalNodes.set(id, node);
  }
}

describe("In-memory driver", () => {
  generateFullTestSuite({
    name: "in-memory",
    runTest: async (options, testFn) => {
      const driver = new InMemoryDriver();
      if (options.initialNodes) {
        initInMemory(driver, options.initialNodes);
      }
      await testFn(driver);
    },
  });
});

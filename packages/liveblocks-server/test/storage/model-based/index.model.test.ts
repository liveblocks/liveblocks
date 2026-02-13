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

import fc from "fast-check";
import { describe, test } from "vitest";

import {
  generateArbitraries,
  selfCheck,
} from "~test/plugins/_generateFullTestSuite";

import { runWithStorage } from "../utils";
import { commands, Model } from "./storage-model";

const arb = generateArbitraries();

describe("Storage (model-based test)", () => {
  test(
    "remains internally consistent no matter what Ops are applied (without schema validation)",
    { timeout: 22_000 },
    async () =>
      fc.assert(
        fc.asyncProperty(
          fc.record({
            initialNodes: arb.nodeStream(),
            commands: commands({
              size: "+2",
              // replayPath: "<paste here to debug>"
            }),
          }),

          async ({ initialNodes, commands }) => {
            // Set up real and reference model
            // In this case, there is no reference model, because the real model
            // will perform a self-check

            await runWithStorage(initialNodes, async ({ storage: real }) => {
              await selfCheck(real);

              const model = new Model(real.loadedDriver.iter_nodes());

              // Tries running randomized sequences of commands (think calling
              // "applyOp(<random op>)" a million times)
              await fc.asyncModelRun(() => ({ model, real }), commands);
            });
          }
        ),
        {
          numRuns: 200, // Stop after 200 iterations, or...
          interruptAfterTimeLimit: 20_000, // ...after 20 seconds (whichever comes first)
          reporter: (out) => {
            if (out.failed) {
              throw new Error(fc.defaultReportMessage(out));
            }
            // Expect at least 50 iterations, though
            const MIN_ITERATIONS = 50;
            if (out.numRuns < MIN_ITERATIONS) {
              throw new Error(
                `Expected at least ${MIN_ITERATIONS} iterations, but only ran ${out.numRuns} (why so slow?)`
              );
            }
          },
        }
      )
  );
});

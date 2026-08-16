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

import type { LiveTextData, StorageNode } from "@liveblocks/core";
import { CrdtType } from "@liveblocks/core";
import fc from "fast-check";
import { describe, test } from "vitest";

import { selfCheck } from "~test/plugins/_generateFullTestSuite";

import { runWithStorage } from "../utils";
import { commands, docArb, Model } from "./live-text-model";

type InitialText = {
  data: LiveTextData;
  version: number;
};

const initialTextsArb = fc.array(
  fc.record({
    data: docArb,
    version: fc.nat(3),
  }),
  { minLength: 1, maxLength: 3 }
);

/**
 * Builds an initial node tree with a root object and the given LiveText nodes
 * attached to it (under keys text0, text1, ...).
 */
function makeNodeStream(texts: InitialText[]): StorageNode[] {
  const nodes: StorageNode[] = [
    ["root", { type: CrdtType.OBJECT, data: {} }],
  ];
  for (const [i, { data, version }] of texts.entries()) {
    nodes.push([
      `text:${i}`,
      {
        type: CrdtType.TEXT,
        parentId: "root",
        parentKey: `text${i}`,
        data,
        version,
      },
    ]);
  }
  return nodes;
}

describe("Storage LiveText (model-based test)", () => {
  test(
    "matches the reference model no matter what UpdateTextOps are applied",
    { timeout: 22_000 },
    async () =>
      fc.assert(
        fc.asyncProperty(
          fc.record({
            initialTexts: initialTextsArb,
            // NOTE: "+2" (like the generic storage model test uses) is too
            // slow here: per-command cost grows with the accepted history
            // (stale ops rebase over everything since their baseVersion), so
            // long sequences get quadratically expensive and starve the
            // min-iterations budget on slower CI runners.
            commands: commands({
              size: "+1",
              // replayPath: "<paste here to debug>"
            }),
          }),

          ({ initialTexts, commands }) =>
            // Set up real system and reference model. The model tracks the
            // expected document data and version per LiveText node, updated by
            // applying the server's authoritative (rebased) ops. Each command
            // also predicts the result action (accepted / rectified / ignored
            // / rejected) and runs the internal-consistency selfCheck.

            runWithStorage(makeNodeStream(initialTexts), ({ storage: real }) => {
              selfCheck(real);

              const model = new Model(real.driver.iter_nodes());

              // Tries running randomized sequences of UpdateTextOps (normal,
              // stale, too-old, duplicate, empty, and future-based ops)
              fc.modelRun(() => ({ model, real }), commands);
            })
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

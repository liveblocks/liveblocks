/* eslint-disable @typescript-eslint/require-await */
import * as fc from "fast-check";
import { expect, test } from "vitest";

import type { OpaqueRoom } from "../src";
import { LiveList } from "../src/crdts/LiveList";
import type { LiveObject } from "../src/crdts/LiveObject";
import { prepareTestsConflicts } from "./utils";

// Simplified model representing the system state.
interface Model {
  needsFlush: {
    A: boolean;
    B: boolean;
  };
}

// Real system: LiveList instances and rooms for both clients
interface Real {
  root1: LiveObject<{ list: LiveList<string> }>;
  root2: LiveObject<{ list: LiveList<string> }>;
  room1: OpaqueRoom;
  room2: OpaqueRoom;
  control: {
    flushA: () => Promise<void>;
    flushB: () => Promise<void>;
  };
}

// Base class for all commands
abstract class BaseCommand implements fc.Command<Model, Real> {
  check(_m: Readonly<Model>): boolean {
    return true;
  }
  abstract run(m: Model, r: Real): Promise<void>;
  abstract toString(): string;
}

// Combined commands that work on either client
class InsertCommand extends BaseCommand {
  constructor(
    private client: "A" | "B",
    private item: string,
    // Unsafe index for insertion. The actual insertion value used will be
    // modulo'ed with the current list's length.
    private unsafeIndex: number
  ) {
    super();
  }

  async run(m: Model, r: Real): Promise<void> {
    const root = this.client === "A" ? r.root1 : r.root2;
    const list = root.get("list");
    list.insert(this.item, this.unsafeIndex % (list.length + 1));
    m.needsFlush[this.client] = true;
  }

  toString(): string {
    return `${this.client}.insert("${this.item}", ${this.unsafeIndex}*)`;
  }
}

class PushCommand extends BaseCommand {
  constructor(
    private client: "A" | "B",
    private item: string
  ) {
    super();
  }

  async run(m: Model, r: Real): Promise<void> {
    const root = this.client === "A" ? r.root1 : r.root2;
    root.get("list").push(this.item);
    m.needsFlush[this.client] = true;
  }

  toString(): string {
    return `${this.client}.push("${this.item}")`;
  }
}

class DeleteCommand extends BaseCommand {
  constructor(
    private client: "A" | "B",
    // Unsafe index for insertion. The actual index to be deleted will be
    // modulo'ed with the current list's length.
    private unsafeIndex: number
  ) {
    super();
  }

  async run(m: Model, r: Real): Promise<void> {
    const root = this.client === "A" ? r.root1 : r.root2;
    const list = root.get("list");
    if (list.length > 0) {
      list.delete(this.unsafeIndex % list.length);
      m.needsFlush[this.client] = true;
    } else {
      // No-op if list is empty
    }
  }

  toString(): string {
    return `${this.client}.delete(${this.unsafeIndex}*)`;
  }
}

class MoveCommand extends BaseCommand {
  constructor(
    private client: "A" | "B",
    // Unsafe indexes for the move. The actual indexes used will be modulo'ed
    // with the current list's length.
    private unsafeFromIndex: number,
    private unsafeToIndex: number
  ) {
    super();
  }

  async run(m: Model, r: Real): Promise<void> {
    const root = this.client === "A" ? r.root1 : r.root2;
    const list = root.get("list");
    if (list.length > 0) {
      const fromIndex = this.unsafeFromIndex % list.length;
      const toIndex = this.unsafeToIndex % list.length;
      list.move(fromIndex, toIndex);
      m.needsFlush[this.client] = true;
    } else {
      return; // No-op if list is empty
    }
  }

  toString(): string {
    return `${this.client}.move(${this.unsafeFromIndex}*, ${this.unsafeToIndex}*)`;
  }
}

class SetCommand extends BaseCommand {
  constructor(
    private client: "A" | "B",
    // Unsafe index for the set. The actual index used will be modulo'ed with
    // the current list's length.
    private unsafeIndex: number,
    private item: string
  ) {
    super();
  }

  async run(m: Model, r: Real): Promise<void> {
    const root = this.client === "A" ? r.root1 : r.root2;
    const list = root.get("list");
    if (list.length > 0) {
      list.set(this.unsafeIndex % list.length, this.item);
      m.needsFlush[this.client] = true;
    } else {
      return; // No-op if list is empty
    }
  }

  toString(): string {
    return `${this.client}.set(${this.unsafeIndex}*, "${this.item}")`;
  }
}

class UndoCommand extends BaseCommand {
  constructor(private client: "A" | "B") {
    super();
  }

  async run(m: Model, r: Real): Promise<void> {
    const room = this.client === "A" ? r.room1 : r.room2;
    room.history.undo();
    m.needsFlush[this.client] = true;
  }

  toString(): string {
    return `${this.client}.undo()`;
  }
}

class RedoCommand extends BaseCommand {
  constructor(private client: "A" | "B") {
    super();
  }

  async run(m: Model, r: Real): Promise<void> {
    const room = this.client === "A" ? r.room1 : r.room2;
    room.history.redo();
    m.needsFlush[this.client] = true;
  }

  toString(): string {
    return `${this.client}.redo()`;
  }
}

// Flush commands
class FlushCommand extends BaseCommand {
  constructor(private client: "A" | "B") {
    super();
  }

  check(m: Readonly<Model>): boolean {
    return m.needsFlush[this.client];
  }

  async run(m: Model, r: Real): Promise<void> {
    if (this.client === "A") {
      m.needsFlush.A = false;
      await r.control.flushA();
    } else {
      m.needsFlush.B = false;
      await r.control.flushB();
    }
  }

  toString(): string {
    const from_ = this.client === "A" ? "A" : "B";
    return `${from_}.flush()`;
  }
}

const genClient = fc.constantFrom("A", "B");
const genItem = fc.stringMatching(/^[A-Za-z]{2}$/);
const genIndex = fc.nat({ max: 5 });

// Generate arbitrary commands
const allCommands = [
  // Flush (4x)
  genClient.map((client) => new FlushCommand(client)),
  genClient.map((client) => new FlushCommand(client)),
  genClient.map((client) => new FlushCommand(client)),
  genClient.map((client) => new FlushCommand(client)),

  // Push (5x)
  fc.tuple(genClient, genItem).map((args) => new PushCommand(...args)),
  fc.tuple(genClient, genItem).map((args) => new PushCommand(...args)),
  fc.tuple(genClient, genItem).map((args) => new PushCommand(...args)),
  fc.tuple(genClient, genItem).map((args) => new PushCommand(...args)),
  fc.tuple(genClient, genItem).map((args) => new PushCommand(...args)),

  // Undo (3x) / redo (1x)
  genClient.map((client) => new UndoCommand(client)),
  genClient.map((client) => new UndoCommand(client)),
  genClient.map((client) => new UndoCommand(client)),
  genClient.map((client) => new RedoCommand(client)),

  // Insert (3x for extra weight)
  fc
    .tuple(genClient, genItem, genIndex)
    .map((args) => new InsertCommand(...args)),
  fc
    .tuple(genClient, genItem, genIndex)
    .map((args) => new InsertCommand(...args)),
  fc
    .tuple(genClient, genItem, genIndex)
    .map((args) => new InsertCommand(...args)),

  // Delete (2x)
  fc.tuple(genClient, genIndex).map((args) => new DeleteCommand(...args)),
  fc.tuple(genClient, genIndex).map((args) => new DeleteCommand(...args)),

  // Move (2x)
  fc
    .tuple(genClient, genIndex, genIndex)
    .map((args) => new MoveCommand(...args)),

  // Set (2x)
  fc.tuple(genClient, genIndex, genItem).map((args) => new SetCommand(...args)),
  fc.tuple(genClient, genIndex, genItem).map((args) => new SetCommand(...args)),
];

test(
  "LiveList operations maintain eventual consistency across clients",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room1, room2, control }) => {
      const real: Real = { root1, root2, room1, room2, control };

      await fc.assert(
        fc.asyncProperty(
          fc.commands(allCommands, { size: "+1" }),
          fc.context(),

          async (commands_, ctx) => {
            const commands = Array.from(commands_);
            fc.pre(commands.length > 3); // Consider test not useful when too few commands

            const setup = () => ({
              model: {
                needsFlush: { A: false, B: false },
              },
              real,
            });

            // Clear the room prior to the testing
            root1.get("list").clear();
            root2.get("list").clear();

            // Clear history to prevent undo operations from affecting previous state
            room1.history.clear();
            room2.history.clear();

            await control.flushA();
            await control.flushB();

            expect(
              root1.get("list").length,
              "Starting condition for the test not met: list1 not empty"
            ).toBe(0);
            expect(
              root2.get("list").length,
              "Starting condition for the test not met: list2 not empty"
            ).toBe(0);

            // Run all commands
            await fc.asyncModelRun(setup, commands);

            // Final sync to ensure eventual consistency
            await control.flushA();
            await control.flushB();

            // Property: both clients should have identical final states
            const list1 = root1.get("list").toImmutable();
            const list2 = root2.get("list").toImmutable();
            ctx.log(`Client A: ${JSON.stringify(list1)}`);
            ctx.log(`Client B: ${JSON.stringify(list2)}`);
            ctx.log(
              `Commands executed:\n${commands
                .map((c) => `- ${c.toString()}`)
                .join("\n")}`
            );

            if (JSON.stringify(list1) !== JSON.stringify(list2)) {
              throw new Error(
                "Consistency violation! Clients disagree on final state of LiveList."
              );
            } else {
              // console.log(
              //   "---------------------------------------------------"
              // );
              // console.log("Commands executed:");
              // for (const c of commands) {
              //   console.log("  - ", c.toString());
              // }
              // console.log("Final consistent state:", JSON.stringify(list1));
              // console.log("");
              // console.log(
              //   "---------------------------------------------------"
              // );
            }
          }
        ),
        { numRuns: 20, verbose: true }
      );
    }
  ),
  60000 // 60 second timeout
);

import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { prepareTestsConflicts } from "./utils";

/**
 * Regressions distilled from the `list-property` property test, which found
 * sequences where two clients fail to converge.
 *
 * They come in two independent failure modes. Don't conflate them:
 *
 *  - LOST UPDATE, 'insert' variant (test 1): undoing a `set` destroys a
 *    *different*, concurrently-inserted item because the undo identifies its
 *    victim by position *key* rather than by *id*, and two independently
 *    created items can share a key. The clients still agree afterwards, they
 *    just silently agree on the wrong thing, so a pure convergence check does
 *    NOT catch it.
 *
 *  - DIVERGENCE, 'delete' variant (tests 2 and 3): a `set` and a `delete`
 *    race on the same item and both clients then undo. The set's value survives
 *    as a phantom on one client only. This needs no key collision at all and is
 *    what the `list-property` convergence assertion trips over. Test 3 is the
 *    same race with an extra sync, which surfaces the phantom as a duplicate.
 *
 *  - DIVERGENCE, 'move' variant (test 4): a `set` is undone on one client
 *    while the other client concurrently `set`s the same slot and then `move`s
 *    its value. The move re-keys the set-value to a position the first client
 *    never saw, so it can never reconcile it away. Same position-as-identity
 *    cause as tests 2 and 3, but reached through the move handler.
 */

/**
 * TEST 1 - lost update, 'insert' variant (clients converge, but on the wrong
 * state).
 *
 * Same `p`/`q` pair as tests 2 and 3 (B replaces its "p" with "q", then undoes
 * it), but here A is also holding a bystander item "x" that collides on the
 * same position key, and the undo destroys it.
 *
 *   A.push("x")     A: [x@"!"]
 *   B.push("p")     B: [p@"!"]              same key "!" as A's "x"
 *   B.set(0, "q")   B: [q@"!"]              undo of this set will restore p@"!"
 *   flushA          B receives x@"!", shifts q aside -> B: [x@"!", q@"!!"]
 *   B.undo()        restore p@"!": sees "x" sitting at "!", detaches it -> B: [p]
 *
 * "x" was pushed by A and never deleted, yet both clients end up at ["p"].
 * Culprit: LiveList #applySetUndoRedo detaches whatever occupies the old
 * position key, keyed by position instead of by id.
 */
test(
  "undo of a set must not clobber a concurrently-inserted item at the same position",
  prepareTestsConflicts(
    { list: new LiveList<string>([]) },

    async ({ root1, root2, room2, control, assert }) => {
      const listA = root1.get("list");
      const listB = root2.get("list");

      listA.push("x");
      listB.push("p");
      listB.set(0, "q");

      // Deliver "x" to B. It collides with B's item on position key "!".
      await control.flushA();

      // Undo the set. Should restore "p" without destroying "x".
      room2.history.undo();

      await control.flushA();
      await control.flushB();

      // "x" was pushed by A and never deleted: it must survive.
      expect(listA.toJSON()).toContain("x");
      // ...and both clients must agree.
      assert({ list: [...listA.toJSON()] });
    }
  )
);

/**
 * TEST 2 - divergence, 'delete' variant: phantom survivor of an undone
 * `set`.
 *
 * The smallest convergence violation we found: a one-item list, a `set` and a
 * `delete` racing on that item, then both clients undo.
 *
 *   init ["c"]
 *   B.set(0, "d")   B replaces "c" with "d"      (reverse: restore "c", drop "d")
 *   A.delete(0)     A concurrently deletes "c"   (reverse: restore "c")
 *   flushB          A applies B's set onto a list it already emptied
 *   B.undo()        B: restore "c", drop "d"  -> B: ["c"]
 *   A.undo()        A: restore "c"            -> A: ["d","c"]
 *
 * Result: A keeps "d", B does not. The divergence is PERMANENT (verified stable
 * across repeated flush round-trips). No position-key collision is involved.
 *
 * Both undos are required: dropping either one converges.
 */
test(
  "clients must converge after a set and a delete race on the same item and both undo",
  prepareTestsConflicts(
    { list: new LiveList<string>(["p"]) },

    async ({ root1, root2, room1, room2, control }) => {
      const A = root1.get("list");
      const B = root2.get("list");

      B.set(0, "q");
      A.delete(0);
      await control.flushB();
      room2.history.undo();
      room1.history.undo();

      await control.flushA();
      await control.flushB();

      // Client should agree
      expect(A.toJSON()).toEqual(B.toJSON()); // ...but A sees ["q","p"], B sees ["p"]
    }
  )
);

/**
 * TEST 3 - divergence, 'delete' variant (extra sync). Same race as test 2,
 * but with one extra A->server sync before the undos. The phantom now surfaces
 * as a DUPLICATE instead of a divergence-by-one:
 *
 *   A ends ["q","p"], B ends ["p","p"]
 *
 * This is the minimal form of the duplicate-item symptom seen in the original
 * property-test counterexamples (e.g. CI run 24460932746, which ended with a
 * doubled "ZF"). Same root cause, different observable corruption.
 */
test(
  "a set/delete race plus an extra sync must not duplicate the item",
  prepareTestsConflicts(
    { list: new LiveList<string>(["p"]) },

    async ({ root1, root2, room1, room2, control }) => {
      const A = root1.get("list");
      const B = root2.get("list");

      B.set(0, "q");
      A.delete(0);
      await control.flushB();
      await control.flushA();
      room2.history.undo();
      room1.history.undo();

      await control.flushA();
      await control.flushB();

      // Clients should agree
      expect(A.toJSON()).toEqual(B.toJSON()); // ...but A sees ["q","p"], B sees ["p","p"]

      // ...and no value should appear more than once
      expect(B.toJSON()).toEqual([...new Set(B.toJSON())]);
    }
  )
);

/**
 * TEST 4 - divergence, 'move' variant. The smallest sequence we found where
 * a `move` is essential to the divergence (not just incidental).
 *
 *   init ["p"]
 *   B.set(0, "q")   B replaces "p" with "q"        (reverse: restore "p", drop "q")
 *   flushB          A applies the set            -> A: ["q"]
 *   B.undo()        B restores "p", drops "q"    -> B: ["p"]   (PENDING)
 *   A.set(0, "r")   A concurrently replaces "q"  -> A: ["r"]
 *   flushA          B applies A's set onto a slot it already swapped underneath
 *   A.move(0, 0)    re-keys "r" (see below)        (PENDING SET_PARENT_KEY)
 *   flushB
 *
 * Result: A keeps "r", B does not -> A: ["r","p"], B: ["p"]. PERMANENT.
 *
 * `move(0, 0)` is NOT a no-op: with index === targetIndex, LiveList.move builds
 * a fresh position *before* the item's current key and dispatches a
 * SET_PARENT_KEY. That re-keys "r" to a position B never saw, so the set-ack
 * reconciliation that would otherwise cancel the phantom (it converges if the
 * move is dropped) never fires.
 */
test(
  "clients must converge when a set is undone while the other client sets and moves the same slot",
  prepareTestsConflicts(
    { list: new LiveList<string>(["p"]) },

    async ({ root1, root2, room2, control }) => {
      const A = root1.get("list");
      const B = root2.get("list");

      B.set(0, "q");
      await control.flushB();
      room2.history.undo();
      A.set(0, "r");
      await control.flushA();
      A.move(0, 0);
      await control.flushB();

      await control.flushA();
      await control.flushB();

      // Clients should agree
      expect(A.toJSON()).toEqual(B.toJSON()); // ...but A sees ["r","p"], B sees ["p"]
    }
  )
);

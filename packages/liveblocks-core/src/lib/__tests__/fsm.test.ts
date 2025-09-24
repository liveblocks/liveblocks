import { assertEq, assertSame, assertThrows } from "tosti";
import { describe, expect, test, vi } from "vitest";

import { assertDoesntThrow } from "../../__tests__/_tostiHelpers";
import { distance, FSM, patterns } from "../fsm";
import { wait } from "../utils";

async function failAfter(ms: number): Promise<void> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject("failed");
    }, ms);
  });
}

describe("helper functions", () => {
  test("distance", () => {
    assertEq(distance("foo.bar.baz", "foo.bar.baz"), [0, 0]);
    assertEq(distance("foo.bar.baz", "foo.bar.qux"), [1, 1]);
    assertEq(distance("foo.bar.baz", "foo.bar.qux.bla"), [1, 2]);
    assertEq(distance("foo.bar.baz", "foo.baz"), [2, 1]);
    assertEq(distance("foo.bar.baz", "yo"), [3, 1]);
    assertEq(distance("yo", "foo.bar.baz"), [1, 3]);
    assertEq(distance("yo", "hey"), [1, 1]);
  });

  test("patterns", () => {
    assertEq(patterns("a.b.c.d.e.f", 3), [
      "a.b.c.d.*",
      "a.b.c.d.e.*",
      "a.b.c.d.e.f",
    ]);
    assertEq(patterns("initial", 1), ["initial"]);
    assertEq(patterns("foo.bar.baz", 1), ["foo.bar.baz"]);
    assertEq(patterns("foo.bar.baz", 2), ["foo.bar.*", "foo.bar.baz"]);
    assertEq(patterns("foo.bar.baz", 3), ["foo.*", "foo.bar.*", "foo.bar.baz"]);
    assertEq(patterns("foo.bar.baz", 4), [
      "*",
      "foo.*",
      "foo.bar.*",
      "foo.bar.baz",
    ]);
    assertThrows(() => patterns("foo.bar.baz", 0), "Invalid number of levels");
    assertThrows(() => patterns("foo.bar.baz", 5), "Invalid number of levels");
  });
});

describe("finite state machine", () => {
  test("cannot start before there is at least an initial state", () => {
    const fsm = new FSM({});
    assertThrows(() => fsm.start(), "No states defined yet");
  });

  test("cannot use FSM when it hasn't started yet", () => {
    const fsm = new FSM({})
      .addState("one")
      .addState("two")
      .addTransitions("one", { GO: "two" });

    // Events sent before starting the machine will throw
    assertThrows(() => fsm.send({ type: "GO" }), "Not started yet");
  });

  test("stopping a machine that hasn't started yet will throw", () => {
    const fsm = new FSM({}).addState("one");
    assertThrows(
      () => fsm.stop(),
      "Cannot stop a state machine that hasn't started yet"
    );
  });

  test("sending *known* events after the FSM has stopped will get ignored", () => {
    const fsm = new FSM({})
      .addState("one")
      .addState("two")
      .addTransitions("one", { GO: "two" });
    fsm.start();
    fsm.stop();
    // Events sent after stopping the machine will get ignored (but will NOT throw)
    assertDoesntThrow(() => fsm.send({ type: "GO" }));
  });

  test("sending *unknown* events after the FSM has stopped will still throw", () => {
    const fsm = new FSM({}).addState("initial");
    fsm.start();
    fsm.stop();
    assertThrows(
      () => fsm.send({ type: "UNKNOWN" }),
      'Invalid event "UNKNOWN"'
    );
  });

  test("cannot get current state when machine hasn't started yet", () => {
    const fsm = new FSM({})
      .addState("red")
      .addState("yellow")
      .addState("green");

    assertThrows(() => fsm.currentState, "Not started yet");
  });

  test("error when there is an nonexisting target state", () => {
    const fsm = new FSM({})
      .addState("initial")
      .addTransitions("initial", {
        SOME_EVENT: "i-am-not-a-valid-state-name",
      })
      .start();

    assertThrows(() => {
      fsm.send({ type: "SOME_EVENT" });
    }, 'Invalid next state name: "i-am-not-a-valid-state-name"');
  });

  test("error when a state name matches no state", () => {
    assertThrows(
      () =>
        new FSM({}).addTransitions("foo", {
          /* not important */
        }),
      'No states match "foo"'
    );
  });

  test("error when a state pattern matches no state", () => {
    assertThrows(
      () =>
        new FSM({}).addState("initial").addTransitions("initial.*", {
          /* not important */
        }),
      'No states match "initial.*"'
    );
  });

  test("initial state", () => {
    const fsm = new FSM({})
      .addState("red")
      .addState("yellow")
      .addState("green")
      .start();

    assertSame(fsm.currentState, "red");
  });

  test("sendIfPossible never errors when target state does not exist", () => {
    const fsm = new FSM({})
      .addState("red")
      .addState("green")

      .addTransitions("red", {
        INVALID: "i-am-not-a-valid-state-name",
        ONLY_WHEN_RED: "green",
      })

      .addTransitions("green", {
        ONLY_WHEN_GREEN: "red",
      })

      .start();

    assertThrows(
      () => fsm.send({ type: "UNKNOWN_EVENT" }),
      'Invalid event "UNKNOWN_EVENT"'
    );

    assertThrows(
      () => fsm.send({ type: "INVALID" }),
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );

    assertSame(fsm.currentState, "red");

    fsm.send({ type: "ONLY_WHEN_GREEN" }); // Event not handled, should be a no-op...
    assertSame(fsm.currentState, "red"); // ...so it doesn't change the state

    fsm.send({ type: "ONLY_WHEN_RED" });
    assertSame(fsm.currentState, "green");

    fsm.send({ type: "ONLY_WHEN_GREEN" });

    // However... .send() fails if this is a completely unknown
    // event (because that's a configuration error)
    assertThrows(
      () => fsm.send({ type: "INVALID" }),
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );
  });

  describe("enter/leave functions", () => {
    test("executes onEnter when starting", () => {
      const onEnterRed = vi.fn();
      const onEnterGreen = vi.fn();
      const onEnterYellow = vi.fn();

      const fsm = new FSM({})
        .addState("red")
        .addState("yellow")
        .addState("green")

        .onEnter("red", onEnterRed)
        .onEnter("yellow", onEnterYellow)
        .onEnter("green", onEnterGreen);

      assertEq(onEnterRed.mock.calls, []);
      assertEq(onEnterYellow.mock.calls, []);
      assertEq(onEnterGreen.mock.calls, []);

      fsm.start();

      assertEq(onEnterRed.mock.calls.length, 1);
      assertEq(onEnterYellow.mock.calls, []);
      assertEq(onEnterGreen.mock.calls, []);
    });

    test("does not execute onExit/onEnter events when explicitly staying in the same state", () => {
      const calls: string[] = [];

      const enterGreen = () => {
        calls.push("entered green");
        return () => {
          calls.push("exited green");
        };
      };

      const fsm = new FSM({})
        .addState("green")

        .onEnter("green", enterGreen)

        .addTransitions("green", {
          DO_NOTHING: "green",
        })

        .start();

      assertEq(fsm.currentState, "green");
      assertEq(calls, ["entered green"]);

      fsm.send({ type: "DO_NOTHING" });

      assertEq(fsm.currentState, "green");
      assertEq(calls, ["entered green"]);
    });

    test("executes cleanup functions when leaving state", () => {
      const calls: string[] = [];

      const onEnterWithCleanup = () => {
        calls.push("light!");
        return () => {
          calls.push("darkness!");
        };
      };

      const fsm = new FSM({})
        .addState("off")
        .addState("on")

        .onEnter("on", onEnterWithCleanup)

        .addTransitions("on", {
          TOGGLE: "off",
        })

        .addTransitions("off", {
          TOGGLE: "on",
        })

        .start();

      assertEq(fsm.currentState, "off");
      assertEq(calls, []);

      fsm.send({ type: "TOGGLE" });
      assertEq(fsm.currentState, "on");
      assertEq(calls, ["light!"]);

      fsm.send({ type: "TOGGLE" });
      assertEq(fsm.currentState, "off");
      assertEq(calls, ["light!", "darkness!"]);

      fsm.send({ type: "TOGGLE" });
      assertEq(fsm.currentState, "on");
      assertEq(calls, ["light!", "darkness!", "light!"]);

      fsm.stop();
      assertEq(calls, ["light!", "darkness!", "light!", "darkness!"]);
    });

    test("executes group-based enter/exit handlers correctly", () => {
      const calls: string[] = [];

      const exitMachine = vi.fn(() => void calls.push("exited machine"));
      const enterMachine = vi.fn(() => {
        calls.push("entered machine");
        return exitMachine;
      });

      const exitGroup = vi.fn(() => void calls.push("exited group"));
      const enterGroup = vi.fn(() => {
        calls.push("entered group");
        return exitGroup;
      });

      const exitRed = vi.fn(() => void calls.push("exited red"));
      const enterRed = vi.fn(() => {
        calls.push("entered red");
        return exitRed;
      });

      const fsm = new FSM({})
        .addState("initial")
        .addState("group.red")
        .addState("group.yellow")
        .addState("group.green")
        .addState("error")

        .addTransitions("*", { ERROR: "error" })
        .addTransitions("initial", { START: "group.red" })
        .addTransitions("group.red", { NEXT: "group.yellow" })
        .addTransitions("group.yellow", { NEXT: "group.green" })
        .addTransitions("group.green", { NEXT: "group.red" })

        .onEnter("*", enterMachine)
        .onEnter("group.*", enterGroup)
        .onEnter("group.red", enterRed);

      fsm.start();
      assertEq(fsm.currentState, "initial");
      assertEq(calls, ["entered machine"]);
      calls.length = 0;

      fsm.send({ type: "START" });
      assertEq(fsm.currentState, "group.red");
      assertEq(calls, ["entered group", "entered red"]);
      calls.length = 0;

      fsm.send({ type: "NEXT" });
      assertEq(fsm.currentState, "group.yellow");
      assertEq(calls, ["exited red"]);
      calls.length = 0;

      fsm.send({ type: "NEXT" });
      assertEq(calls, []);
      calls.length = 0;

      fsm.send({ type: "NEXT" });
      assertEq(calls, ["entered red"]);
      calls.length = 0;

      fsm.send({ type: "ERROR" });
      assertEq(calls, ["exited red", "exited group"]);
      calls.length = 0;

      fsm.stop();
      assertEq(calls, ["exited machine"]);
    });
  });

  test("using wildcards to describe transitions from a group of states", () => {
    const fsm = new FSM({})
      .addState("foo.one")
      .addState("foo.two")
      .addState("bar.three")

      .addTransitions("*", {
        FROM_ANYWHERE: "foo.two",
      })

      .addTransitions("foo.*", {
        FROM_FOO_ONLY: "bar.three",
      })

      .start();

    assertEq(fsm.currentState, "foo.one");
    fsm.send({ type: "FROM_ANYWHERE" });
    assertEq(fsm.currentState, "foo.two");
    fsm.send({ type: "FROM_ANYWHERE" });
    assertEq(fsm.currentState, "foo.two");
    fsm.send({ type: "FROM_FOO_ONLY" });
    assertEq(fsm.currentState, "bar.three");

    fsm.send({ type: "FROM_FOO_ONLY" }); // This event is not handled by this state, it's a no-op
    assertEq(fsm.currentState, "bar.three");

    fsm.send({ type: "FROM_ANYWHERE" });
    assertEq(fsm.currentState, "foo.two");
  });

  test("patching context", () => {
    const fsm = new FSM({ x: 0 })
      .addState("one")
      .addState("two")

      .addTransitions("one", {
        GO: {
          target: "two",
          effect: (ctx) => ctx.patch({ x: 0 }),
        },
      })

      .addTransitions("two", {
        BACK: "one",
        GO: {
          target: "two", // Stay here, but... do an action
          effect: (ctx) => ctx.patch({ x: ctx.x + 1 }),
        },
      })

      .start();

    assertEq(fsm.currentState, "one");
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "two");
    assertEq(fsm.context, { x: 3 });

    fsm.send({ type: "BACK" });
    assertEq(fsm.currentState, "one");
    assertEq(fsm.context, { x: 3 }); // Still at 3!

    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "two");
    assertEq(fsm.context, { x: 0 }); // Reset to 0!

    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "two");
    assertEq(fsm.context, { x: 5 });
  });

  test("patching context (prevents patching old/stale contexts)", () => {
    const fsm = new FSM({ x: 0 })
      .addState("one")
      .addState("two")
      .addTransitions("one", { GO: "two" })
      .addTransitions("two", { GO: "one" })

      .onEnter("two", (ctx1) => {
        ctx1.patch({ x: 13 });

        return () => {
          // NOTE: Patching an old context is an accident and will throw!
          ctx1.patch({ x: 7 });
        };
      })

      .start();

    assertEq(fsm.currentState, "one");
    assertEq(fsm.context, { x: 0 });
    fsm.send({ type: "GO" });
    assertEq(fsm.context, { x: 13 });

    // Leaving "two" state will trigger onExit handler which contains the bug
    assertThrows(
      () => fsm.send({ type: "GO" }),
      "Can no longer patch stale context"
    );
  });

  test("patching context (on enter)", () => {
    const fsm = new FSM({ x: 0 })
      .addState("one")
      .addState("two")
      .addTransitions("one", { GO: "two" })
      .addTransitions("two", { GO: "one" })

      .onEnter("two", (ctx1) => {
        // Can call .patch() multiple times (the last one will win)
        ctx1.patch({ x: 8 });
        ctx1.patch({ x: -4 });
        ctx1.patch({ x: 13 }); // winner
        ctx1.patch({}); // won't overwrite anything

        return (ctx2) => {
          ctx2.patch({ x: -99 });
          ctx2.patch({ x: 7 }); // winner
          ctx2.patch({}); // won't overwrite anything
        };
      })

      .start();

    assertEq(fsm.currentState, "one");
    assertEq(fsm.context, { x: 0 });
    fsm.send({ type: "GO" });
    assertEq(fsm.context, { x: 13 });
    fsm.send({ type: "GO" });
    assertEq(fsm.context, { x: 7 });
  });

  test("side effects", () => {
    const reset = vi.fn();
    const inced = vi.fn();

    const fsm = new FSM({ x: 13, y: 13 })
      .addState("one")
      .addState("two")

      .addTransitions("one", {
        GO: {
          target: "two",
          effect: [(ctx) => ctx.patch({ x: 0 }), reset],
        },
      })

      .addTransitions("two", {
        BACK: "one",
        GO: {
          target: "two", // Stay here, but... do an action
          effect: [(ctx) => ctx.patch({ x: ctx.x + 1 }), inced],
        },
      })

      .start();

    assertEq(fsm.currentState, "one");
    assertEq(reset.mock.calls, []);
    assertEq(inced.mock.calls, []);
    fsm.send({ type: "GO" });
    assertEq(reset.mock.calls.length, 1);
    assertEq(inced.mock.calls, []);
    fsm.send({ type: "GO" });
    assertEq(reset.mock.calls.length, 1);
    expect(inced).toHaveBeenLastCalledWith(
      { x: 1, y: 13, patch: expect.any(Function) },
      { type: "GO" }
    );
    fsm.send({ type: "GO" });
    assertEq(reset.mock.calls.length, 1);
    expect(inced).toHaveBeenLastCalledWith(
      { x: 2, y: 13, patch: expect.any(Function) },
      { type: "GO" }
    );
    fsm.send({ type: "GO" });
    assertEq(reset.mock.calls.length, 1);
    expect(inced).toHaveBeenLastCalledWith(
      { x: 3, y: 13, patch: expect.any(Function) },
      { type: "GO" }
    );
    assertEq(fsm.context, { x: 3, y: 13 });
  });

  test("explicitly *not* transitioning", () => {
    let n = 0;

    const fsm = new FSM({})
      .addState("one")
      .addState("two")
      .addTransitions("one", { GO: "two" })
      .addTransitions("two", {
        GO: () =>
          n++ % 2 === 0
            ? "one" // Transition if n is even
            : null, // Otherwise, do nothing
      })
      .start();

    assertEq(fsm.currentState, "one");
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "two");
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "one");
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "two");
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "two"); // Did *not* transition!
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "one");
  });

  describe("time-based transitions", () => {
    test("time-based transitions", () => {
      vi.useFakeTimers();

      const fsm = new FSM({})
        .addState("start.one")
        .addState("start.two")
        .addState("end")
        .addState("timed-out")

        .addTransitions("start.one", { GO: "start.two" })
        .addTransitions("start.two", { GO: "start.one" })
        .addTransitions("start.*", { END: "end" })

        .addTimedTransition("start.*", 10000, "timed-out")

        .start();

      // Staying within the "start" group won't cancel
      assertEq(fsm.currentState, "start.one");
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      assertEq(fsm.currentState, "start.two");

      vi.runAllTimers(); // Make the timer go off...
      assertEq(fsm.currentState, "timed-out"); // ...the timer causes the machine to move to "timed-out" state
    });

    test("time-based transitions get cancelled", () => {
      vi.useFakeTimers();

      const fsm = new FSM({})
        .addState("start.one")
        .addState("start.two")
        .addState("end")
        .addState("timed-out")

        .addTransitions("start.one", { GO: "start.two" })
        .addTransitions("start.two", { GO: "start.one" })
        .addTransitions("start.*", { END: "end" })

        .addTimedTransition("start.*", 10000, "timed-out")

        .start();

      vi.advanceTimersByTime(5000); // Not far enough yet

      // Staying within the "start" group won't cancel
      assertEq(fsm.currentState, "start.one");
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      assertEq(fsm.currentState, "start.two");

      fsm.send({ type: "END" });
      assertEq(fsm.currentState, "end");

      vi.runAllTimers(); // Make the timer go off...
      assertEq(fsm.currentState, "end"); // ...it should _NOT_ move to timed-out state anymore
    });
  });

  describe("promise-based transitions", () => {
    function makeFSM(
      promiseFn: (context: unknown, signal: AbortSignal) => Promise<unknown>
    ) {
      const fsm = new FSM({})
        .addState("waiting.one")
        .addState("waiting.two")
        .addState("good")
        .addState("bad")

        // Manual transitions (callable via .send())
        .addTransitions("waiting.*", { OK: "good", FAIL: "bad" })
        .addTransitions("waiting.one", { JUMP: "waiting.two" })
        .addTransitions("waiting.two", { JUMP: "waiting.one" })

        // Automatic transitions (based on promise results)
        .onEnterAsync("waiting.*", promiseFn, "good", "bad", 30_000);

      return fsm;
    }

    test("promise-based transitions (on success, within timeout)", async () => {
      vi.useFakeTimers();

      const fsm = makeFSM(() => wait(2000));
      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);
      assertEq(fsm.currentState, "waiting.one");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "good");

      fsm.stop();
    });

    test("promise-based transitions (on failure, within timeout)", async () => {
      vi.useFakeTimers();

      const fsm = makeFSM(() => failAfter(2000));
      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "bad");

      fsm.stop();
    });

    test("promise-based transitions (on timeout)", async () => {
      vi.useFakeTimers();

      // One millisecond longer than the allowed timeout (30_000)
      const fsm = makeFSM(() => wait(30_001));
      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "bad");

      fsm.stop();
    });

    test("promise-based transitions abort successfully (on success)", async () => {
      vi.useFakeTimers();

      const fsm = makeFSM(() => wait(2000));
      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);
      assertEq(fsm.currentState, "waiting.one");
      fsm.send({ type: "FAIL" }); // Manually failing first...
      assertEq(fsm.currentState, "bad");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "bad"); // ...will ignore the returned promise transition
    });

    test("promise-based transitions abort successfully (on failure)", async () => {
      vi.useFakeTimers();

      const fsm = makeFSM(() => failAfter(2000));
      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);
      assertEq(fsm.currentState, "waiting.one");
      fsm.send({ type: "OK" }); // Manually failing first...
      assertEq(fsm.currentState, "good");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "good"); // ...will ignore the returned promise transition
    });

    test("promise-based transitions won't abort within group", async () => {
      vi.useFakeTimers();

      const fsm = makeFSM(() => failAfter(2000));
      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      fsm.send({ type: "JUMP" });
      assertEq(fsm.currentState, "waiting.two");
      fsm.send({ type: "JUMP" });
      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);

      // We can keep jumping between waiting.* states without the promise
      // getting cancelled (unlike jumping to "good" or "bad")
      assertEq(fsm.currentState, "waiting.one");
      fsm.send({ type: "JUMP" });
      assertEq(fsm.currentState, "waiting.two");

      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "bad"); // ...will ignore the returned promise transition
    });

    test("promise-based transitions abort with signal handler (when aborted)", async () => {
      vi.useFakeTimers();

      let gotAborted = false;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        function f() {
          gotAborted = true;
        }
        signal.addEventListener("abort", f);
        try {
          await wait(2000);
        } finally {
          signal.removeEventListener("abort", f);
        }
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);
      assertEq(fsm.currentState, "waiting.one");
      assertEq(gotAborted, false);
      fsm.send({ type: "FAIL" }); // Manually failing first...
      assertEq(gotAborted, true);
      assertEq(fsm.currentState, "bad");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "bad"); // ...will ignore the returned promise transition
      assertEq(gotAborted, true);
    });

    test("promise-based transitions abort with signal handler (when timed out)", async () => {
      vi.useFakeTimers();

      let gotAborted = false;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        function f() {
          gotAborted = true;
        }
        signal.addEventListener("abort", f);
        try {
          await wait(60000);
        } finally {
          signal.removeEventListener("abort", f);
        }
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      assertEq(gotAborted, false);
      await vi.runAllTimersAsync();
      assertEq(gotAborted, true); // Got aborted by timeout
      assertEq(fsm.currentState, "bad");

      fsm.stop();
    });
    test("promise-based transitions abort with signal handler (when not aborted)", async () => {
      vi.useFakeTimers();

      let hijackedSignal: AbortSignal | undefined;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        hijackedSignal = signal;
        await wait(2000);
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "good");
      assertEq(hijackedSignal?.aborted, false);
    });

    test("promise-based transitions abort with signal inspection (when aborted)", async () => {
      vi.useFakeTimers();

      let gotAborted = false;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        await wait(2000);
        gotAborted = signal.aborted;
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);
      assertEq(fsm.currentState, "waiting.one");
      assertEq(gotAborted, false);
      fsm.send({ type: "FAIL" }); // Manually failing first...
      assertEq(gotAborted, false); // not yet visible before promise has run
      assertEq(fsm.currentState, "bad");
      await vi.runAllTimersAsync();
      assertEq(gotAborted, true);
      assertEq(fsm.currentState, "bad"); // ...will ignore the returned promise transition
    });

    test("promise-based transitions abort with signal inspection (when not aborted)", async () => {
      vi.useFakeTimers();

      let hijackedSignal: AbortSignal | undefined;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        hijackedSignal = signal;
        await wait(2000);
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "good");
      assertEq(hijackedSignal?.aborted, false);
    });

    test("promise-based transitions abort failing promise with signal handler (when aborted)", async () => {
      vi.useFakeTimers();

      let gotAborted = false;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        function f() {
          gotAborted = true;
        }
        signal.addEventListener("abort", f);
        try {
          await failAfter(2000);
        } finally {
          signal.removeEventListener("abort", f);
        }
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);
      assertEq(fsm.currentState, "waiting.one");
      assertEq(gotAborted, false);
      fsm.send({ type: "OK" }); // Manually move to good...
      assertEq(gotAborted, true);
      assertEq(fsm.currentState, "good");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "good"); // ...will ignore the returned promise transition
      assertEq(gotAborted, true);
    });

    test("promise-based transitions abort failing promise with signal handler (when not aborted)", async () => {
      vi.useFakeTimers();

      let gotAborted = false;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        function f() {
          gotAborted = true;
        }
        signal.addEventListener("abort", f);
        try {
          await failAfter(2000);
        } finally {
          signal.removeEventListener("abort", f);
        }
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "bad");
      assertEq(gotAborted, false);
    });

    test("promise-based transitions abort failing promise with signal inspection (when aborted)", async () => {
      vi.useFakeTimers();

      let hijackedSignal: AbortSignal | undefined;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        hijackedSignal = signal;
        await failAfter(2000);
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.advanceTimersByTimeAsync(1000);
      assertEq(fsm.currentState, "waiting.one");
      assertEq(hijackedSignal?.aborted, false);
      fsm.send({ type: "OK" }); // Manually move to good...
      assertEq(hijackedSignal?.aborted, true);
      assertEq(fsm.currentState, "good");
      assertEq(hijackedSignal?.aborted, true);
    });

    test("promise-based transitions abort failing promise with signal inspection (when not aborted)", async () => {
      vi.useFakeTimers();

      let hijackedSignal: AbortSignal | undefined;

      const fsm = makeFSM(async (_, signal: AbortSignal) => {
        hijackedSignal = signal;
        await failAfter(2000);
      });

      fsm.start();

      assertEq(fsm.currentState, "waiting.one");
      await vi.runAllTimersAsync();
      assertEq(fsm.currentState, "bad");
      assertEq(hijackedSignal?.aborted, false);
    });
  });

  test("wildcards cannot overwrite existing transitions", () => {
    const fsm = new FSM({})
      .addState("start")
      .addState("end")

      // Using target specifications in all of its forms here
      .addTransitions("start", { GO: "end" })

      // No overrides here, so perfectly fine 👍
      .addTransitions("*", { TO_START: "start" })
      .addTransitions("*", { TO_END: "end" });

    assertThrows(
      () =>
        fsm
          // This wildcard transition should _not_ be allowed, as it would
          // override/conflict with the existing start->GO transition defined
          // earlier
          .addTransitions("*", { GO: "start" }),
      'Trying to set transition "GO" on "start" (via "*"), but a transition already exists there.'
    );

    fsm.start();

    assertEq(fsm.currentState, "start");
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "end");
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    assertEq(fsm.currentState, "end");

    fsm.send({ type: "TO_START" });
    assertEq(fsm.currentState, "start");
    fsm.send({ type: "TO_START" });
    assertEq(fsm.currentState, "start");

    fsm.send({ type: "TO_END" });
    assertEq(fsm.currentState, "end");
    fsm.send({ type: "TO_END" });
    assertEq(fsm.currentState, "end");
  });
});

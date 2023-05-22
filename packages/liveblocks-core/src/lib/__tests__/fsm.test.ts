import { distance, FSM, patterns } from "../fsm";

async function sleep(ms: number): Promise<42> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(42);
    }, ms);
  });
}

async function failAfter(ms: number): Promise<void> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject("failed");
    }, ms);
  });
}

describe("helper functions", () => {
  test("distance", () => {
    expect(distance("foo.bar.baz", "foo.bar.baz")).toEqual([0, 0]);
    expect(distance("foo.bar.baz", "foo.bar.qux")).toEqual([1, 1]);
    expect(distance("foo.bar.baz", "foo.bar.qux.bla")).toEqual([1, 2]);
    expect(distance("foo.bar.baz", "foo.baz")).toEqual([2, 1]);
    expect(distance("foo.bar.baz", "yo")).toEqual([3, 1]);
    expect(distance("yo", "foo.bar.baz")).toEqual([1, 3]);
    expect(distance("yo", "hey")).toEqual([1, 1]);
  });

  test("patterns", () => {
    expect(patterns("a.b.c.d.e.f", 3)).toEqual([
      "a.b.c.d.*",
      "a.b.c.d.e.*",
      "a.b.c.d.e.f",
    ]);
    expect(patterns("initial", 1)).toEqual(["initial"]);
    expect(patterns("foo.bar.baz", 1)).toEqual(["foo.bar.baz"]);
    expect(patterns("foo.bar.baz", 2)).toEqual(["foo.bar.*", "foo.bar.baz"]);
    expect(patterns("foo.bar.baz", 3)).toEqual([
      "foo.*",
      "foo.bar.*",
      "foo.bar.baz",
    ]);
    expect(patterns("foo.bar.baz", 4)).toEqual([
      "*",
      "foo.*",
      "foo.bar.*",
      "foo.bar.baz",
    ]);
    expect(() => patterns("foo.bar.baz", 0)).toThrow(
      "Invalid number of levels"
    );
    expect(() => patterns("foo.bar.baz", 5)).toThrow(
      "Invalid number of levels"
    );
  });
});

describe("finite state machine", () => {
  test("cannot start before there is at least an initial state", () => {
    const fsm = new FSM({});
    expect(() => fsm.start()).toThrow("No states defined yet");
  });

  test("cannot use FSM when it hasn't started yet", () => {
    const fsm = new FSM({});
    expect(() => fsm.send({ type: "SOME_EVENT" })).toThrow("Not started yet");
  });

  test("cannot get current state when machine hasn't started yet", () => {
    const fsm = new FSM({})
      .addState("red")
      .addState("yellow")
      .addState("green");

    expect(() => fsm.currentState).toThrow("Not started yet");
  });

  test("error when there is an nonexisting target state", () => {
    const fsm = new FSM({})
      .addState("initial")
      .addTransitions("initial", {
        SOME_EVENT: "i-am-not-a-valid-state-name",
      })
      .start();

    expect(() => {
      fsm.send({ type: "SOME_EVENT" });
    }).toThrow('Invalid next state name: "i-am-not-a-valid-state-name"');
  });

  test("error when a state name matches no state", () => {
    expect(() =>
      new FSM({}).addTransitions("foo", {
        /* not important */
      })
    ).toThrow('No states match "foo"');
  });

  test("error when a state pattern matches no state", () => {
    expect(() =>
      new FSM({}).addState("initial").addTransitions("initial.*", {
        /* not important */
      })
    ).toThrow('No states match "initial.*"');
  });

  test("initial state", () => {
    const fsm = new FSM({})
      .addState("red")
      .addState("yellow")
      .addState("green")
      .start();

    expect(fsm.currentState).toBe("red");
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

    expect(() => fsm.send({ type: "UNKNOWN_EVENT" })).toThrow(
      'Invalid event "UNKNOWN_EVENT"'
    );

    expect(() => fsm.send({ type: "INVALID" })).toThrow(
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );

    expect(fsm.currentState).toBe("red");

    fsm.send({ type: "ONLY_WHEN_GREEN" }); // Event not handled, should be a no-op...
    expect(fsm.currentState).toBe("red"); // ...so it doesn't change the state

    fsm.send({ type: "ONLY_WHEN_RED" });
    expect(fsm.currentState).toBe("green");

    fsm.send({ type: "ONLY_WHEN_GREEN" });

    // However... .send() fails if this is a completely unknown
    // event (because that's a configuration error)
    expect(() => fsm.send({ type: "INVALID" })).toThrow(
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );
  });

  describe("enter/leave functions", () => {
    test("executes onEnter when starting", () => {
      const onEnterRed = jest.fn();
      const onEnterGreen = jest.fn();
      const onEnterYellow = jest.fn();

      const fsm = new FSM({})
        .addState("red")
        .addState("yellow")
        .addState("green")

        .onEnter("red", onEnterRed)
        .onEnter("yellow", onEnterYellow)
        .onEnter("green", onEnterGreen);

      expect(onEnterRed).not.toBeCalled();
      expect(onEnterYellow).not.toBeCalled();
      expect(onEnterGreen).not.toBeCalled();

      fsm.start();

      expect(onEnterRed).toBeCalledTimes(1);
      expect(onEnterYellow).not.toBeCalled();
      expect(onEnterGreen).not.toBeCalled();
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

      expect(fsm.currentState).toEqual("green");
      expect(calls).toEqual(["entered green"]);

      fsm.send({ type: "DO_NOTHING" });

      expect(fsm.currentState).toEqual("green");
      expect(calls).toEqual(["entered green"]);
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

      expect(fsm.currentState).toEqual("off");
      expect(calls).toEqual([]);

      fsm.send({ type: "TOGGLE" });
      expect(fsm.currentState).toEqual("on");
      expect(calls).toEqual(["light!"]);

      fsm.send({ type: "TOGGLE" });
      expect(fsm.currentState).toEqual("off");
      expect(calls).toEqual(["light!", "darkness!"]);

      fsm.send({ type: "TOGGLE" });
      expect(fsm.currentState).toEqual("on");
      expect(calls).toEqual(["light!", "darkness!", "light!"]);

      fsm.stop();
      expect(calls).toEqual(["light!", "darkness!", "light!", "darkness!"]);
    });

    test("executes group-based enter/exit handlers correctly", () => {
      const calls: string[] = [];

      const exitMachine = jest.fn(() => void calls.push("exited machine"));
      const enterMachine = jest.fn(() => {
        calls.push("entered machine");
        return exitMachine;
      });

      const exitGroup = jest.fn(() => void calls.push("exited group"));
      const enterGroup = jest.fn(() => {
        calls.push("entered group");
        return exitGroup;
      });

      const exitRed = jest.fn(() => void calls.push("exited red"));
      const enterRed = jest.fn(() => {
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
      expect(fsm.currentState).toEqual("initial");
      expect(calls).toEqual(["entered machine"]);
      calls.length = 0;

      fsm.send({ type: "START" });
      expect(fsm.currentState).toEqual("group.red");
      expect(calls).toEqual(["entered group", "entered red"]);
      calls.length = 0;

      fsm.send({ type: "NEXT" });
      expect(fsm.currentState).toEqual("group.yellow");
      expect(calls).toEqual(["exited red"]);
      calls.length = 0;

      fsm.send({ type: "NEXT" });
      expect(calls).toEqual([]);
      calls.length = 0;

      fsm.send({ type: "NEXT" });
      expect(calls).toEqual(["entered red"]);
      calls.length = 0;

      fsm.send({ type: "ERROR" });
      expect(calls).toEqual(["exited red", "exited group"]);
      calls.length = 0;

      fsm.stop();
      expect(calls).toEqual(["exited machine"]);
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

    expect(fsm.currentState).toEqual("foo.one");
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.two");
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.two");
    fsm.send({ type: "FROM_FOO_ONLY" });
    expect(fsm.currentState).toEqual("bar.three");

    fsm.send({ type: "FROM_FOO_ONLY" }); // This event is not handled by this state, it's a no-op
    expect(fsm.currentState).toEqual("bar.three");

    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.two");
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

    expect(fsm.currentState).toEqual("one");
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("two");
    expect(fsm.context).toEqual({ x: 3 });

    fsm.send({ type: "BACK" });
    expect(fsm.currentState).toEqual("one");
    expect(fsm.context).toEqual({ x: 3 }); // Still at 3!

    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("two");
    expect(fsm.context).toEqual({ x: 0 }); // Reset to 0!

    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("two");
    expect(fsm.context).toEqual({ x: 5 });
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

    expect(fsm.currentState).toEqual("one");
    expect(fsm.context).toEqual({ x: 0 });
    fsm.send({ type: "GO" });
    expect(fsm.context).toEqual({ x: 13 });

    // Leaving "two" state will trigger onExit handler which contains the bug
    expect(() => fsm.send({ type: "GO" })).toThrow(
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

    expect(fsm.currentState).toEqual("one");
    expect(fsm.context).toEqual({ x: 0 });
    fsm.send({ type: "GO" });
    expect(fsm.context).toEqual({ x: 13 });
    fsm.send({ type: "GO" });
    expect(fsm.context).toEqual({ x: 7 });
  });

  test("side effects", () => {
    const reset = jest.fn();
    const inced = jest.fn();

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

    expect(fsm.currentState).toEqual("one");
    expect(reset).not.toBeCalled();
    expect(inced).not.toBeCalled();
    fsm.send({ type: "GO" });
    expect(reset).toBeCalledTimes(1);
    expect(inced).not.toBeCalled();
    fsm.send({ type: "GO" });
    expect(reset).toBeCalledTimes(1);
    expect(inced).toHaveBeenLastCalledWith(
      { x: 1, y: 13, patch: expect.any(Function) },
      { type: "GO" }
    );
    fsm.send({ type: "GO" });
    expect(reset).toBeCalledTimes(1);
    expect(inced).toHaveBeenLastCalledWith(
      { x: 2, y: 13, patch: expect.any(Function) },
      { type: "GO" }
    );
    fsm.send({ type: "GO" });
    expect(reset).toBeCalledTimes(1);
    expect(inced).toHaveBeenLastCalledWith(
      { x: 3, y: 13, patch: expect.any(Function) },
      { type: "GO" }
    );
    expect(fsm.context).toEqual({ x: 3, y: 13 });
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

    expect(fsm.currentState).toEqual("one");
    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("two");
    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("one");
    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("two");
    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("two"); // Did *not* transition!
    fsm.send({ type: "GO" });
    expect(fsm.currentState).toEqual("one");
  });

  describe("time-based transitions", () => {
    test("time-based transitions", () => {
      jest.useFakeTimers();

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
      expect(fsm.currentState).toEqual("start.one");
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      expect(fsm.currentState).toEqual("start.two");

      jest.runAllTimers(); // Make the timer go off...
      expect(fsm.currentState).toEqual("timed-out"); // ...the timer causes the machine to move to "timed-out" state
    });

    test("time-based transitions get cancelled", () => {
      jest.useFakeTimers();

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

      jest.advanceTimersByTime(5000); // Not far enough yet

      // Staying within the "start" group won't cancel
      expect(fsm.currentState).toEqual("start.one");
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      fsm.send({ type: "GO" });
      expect(fsm.currentState).toEqual("start.two");

      fsm.send({ type: "END" });
      expect(fsm.currentState).toEqual("end");

      jest.runAllTimers(); // Make the timer go off...
      expect(fsm.currentState).toEqual("end"); // ...it should _NOT_ move to timed-out state anymore
    });
  });

  describe("promise-based transitions", () => {
    function makeFSM(promiseFn: () => Promise<unknown>) {
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
        .onEnterAsync("waiting.*", promiseFn, "good", "bad");

      return fsm;
    }

    test("promise-based transitions (on success)", async () => {
      jest.useFakeTimers();

      const fsm = makeFSM(() => sleep(2000));
      fsm.start();

      expect(fsm.currentState).toEqual("waiting.one");
      await jest.advanceTimersByTimeAsync(1000);
      expect(fsm.currentState).toEqual("waiting.one");
      await jest.runAllTimersAsync();
      expect(fsm.currentState).toEqual("good");
    });

    test("promise-based transitions (on failure)", async () => {
      jest.useFakeTimers();

      const fsm = makeFSM(() => failAfter(2000));
      fsm.start();

      expect(fsm.currentState).toEqual("waiting.one");
      await jest.advanceTimersByTimeAsync(1000);
      expect(fsm.currentState).toEqual("waiting.one");
      await jest.runAllTimersAsync();
      expect(fsm.currentState).toEqual("bad");
    });

    test("promise-based transitions abort successfully (on success)", async () => {
      jest.useFakeTimers();

      const fsm = makeFSM(() => sleep(2000));
      fsm.start();

      expect(fsm.currentState).toEqual("waiting.one");
      await jest.advanceTimersByTimeAsync(1000);
      expect(fsm.currentState).toEqual("waiting.one");
      fsm.send({ type: "FAIL" }); // Manually failing first...
      expect(fsm.currentState).toEqual("bad");
      await jest.runAllTimersAsync();
      expect(fsm.currentState).toEqual("bad"); // ...will ignore the returned promise transition
    });

    test("promise-based transitions abort successfully (on failure)", async () => {
      jest.useFakeTimers();

      const fsm = makeFSM(() => failAfter(2000));
      fsm.start();

      expect(fsm.currentState).toEqual("waiting.one");
      await jest.advanceTimersByTimeAsync(1000);
      expect(fsm.currentState).toEqual("waiting.one");
      fsm.send({ type: "OK" }); // Manually failing first...
      expect(fsm.currentState).toEqual("good");
      await jest.runAllTimersAsync();
      expect(fsm.currentState).toEqual("good"); // ...will ignore the returned promise transition
    });

    test("promise-based transitions won't abort within group", async () => {
      jest.useFakeTimers();

      const fsm = makeFSM(() => failAfter(2000));
      fsm.start();

      expect(fsm.currentState).toEqual("waiting.one");
      fsm.send({ type: "JUMP" });
      expect(fsm.currentState).toEqual("waiting.two");
      fsm.send({ type: "JUMP" });
      expect(fsm.currentState).toEqual("waiting.one");
      await jest.advanceTimersByTimeAsync(1000);

      // We can keep jumping between waiting.* states without the promise
      // getting cancelled (unlike jumping to "good" or "bad")
      expect(fsm.currentState).toEqual("waiting.one");
      fsm.send({ type: "JUMP" });
      expect(fsm.currentState).toEqual("waiting.two");

      await jest.runAllTimersAsync();
      expect(fsm.currentState).toEqual("bad"); // ...will ignore the returned promise transition
    });
  });

  // TODO Nice to have, no need to fix this right now yet
  test.skip("wildcards cannot overwrite existing transitions", () => {
    const fsm = new FSM({})
      .addState("foo.start")
      .addState("foo.mid")
      .addState("foo.end")

      .addTransitions("foo.start", {
        FROM_ANYWHERE: "foo.mid",
      })

      .addTransitions("foo.mid", {
        FROM_ANYWHERE: "foo.end",
      })

      // This wildcard should _not_ override the transitions defined above
      .addTransitions("*", {
        FROM_ANYWHERE: "foo.start",
      })

      .start();

    expect(fsm.currentState).toEqual("foo.start");
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.mid");
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.end");
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.start");
  });
});

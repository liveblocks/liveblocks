import { FiniteStateMachine as FSM, distance, patterns } from "../fsm";

describe("helper function", () => {
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
    const fsm = new FSM(null);
    expect(() => fsm.start()).toThrow("No states defined yet");
  });

  test("cannot use FSM when it hasn't started yet", () => {
    const fsm = new FSM(null);
    expect(() => fsm.send({ type: "SOME_EVENT" })).toThrow("Not started yet");
  });

  test("cannot get current state when machine hasn't started yet", () => {
    const fsm = new FSM(null)
      .addState("red")
      .addState("yellow")
      .addState("green");

    expect(() => fsm.currentState).toThrow("Not started yet");
  });

  test("error when there is an nonexisting target state", () => {
    const fsm = new FSM(null)
      .addState("initial")
      .addTransitions("initial", {
        SOME_EVENT: () => "i-am-not-a-valid-state-name",
      })
      .start();

    expect(() => {
      fsm.send({ type: "SOME_EVENT" });
    }).toThrow('Invalid next state name: "i-am-not-a-valid-state-name"');
  });

  test("error when a state name matches no state", () => {
    expect(() =>
      new FSM(null).addTransitions("foo", {
        /* not important */
      })
    ).toThrow('No states match "foo"');
  });

  test("error when a state pattern matches no state", () => {
    expect(() =>
      new FSM(null).addState("initial").addTransitions("initial.*", {
        /* not important */
      })
    ).toThrow('No states match "initial.*"');
  });

  test("initial state", () => {
    const fsm = new FSM(null)
      .addState("red")
      .addState("yellow")
      .addState("green")
      .start();

    expect(fsm.currentState).toBe("red");
  });

  test("sendIfPossible never errors when target state does not exist", () => {
    const fsm = new FSM(null)
      .addState("red")
      .addState("green")

      .addTransitions("red", {
        INVALID: () => "i-am-not-a-valid-state-name",
        ONLY_WHEN_RED: () => "green",
      })

      .addTransitions("green", {
        ONLY_WHEN_GREEN: () => "red",
      })

      .start();

    expect(() => fsm.send({ type: "UNKNOWN_EVENT" })).toThrow(
      'Unknown event "UNKNOWN_EVENT"'
    );

    expect(() => fsm.send({ type: "INVALID" })).toThrow(
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );

    expect(fsm.currentState).toBe("red");

    expect(() => fsm.send({ type: "ONLY_WHEN_GREEN" })).toThrow(
      'Event "ONLY_WHEN_GREEN" is not allowed from state "red"'
    );
    expect(() => fsm.sendIfPossible({ type: "ONLY_WHEN_GREEN" })).not.toThrow();
    expect(fsm.currentState).toBe("red"); // Doesn't change the state

    fsm.sendIfPossible({ type: "ONLY_WHEN_RED" }); // Acts like .send()
    expect(fsm.currentState).toBe("green");

    fsm.sendIfPossible({ type: "ONLY_WHEN_GREEN" });

    // Still fails (because this is a configuration error)
    expect(() => fsm.sendIfPossible({ type: "INVALID" })).toThrow(
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );
  });

  describe("enter/leave functions", () => {
    test("executes onEnter when starting", () => {
      const onEnterRed = jest.fn();
      const onEnterGreen = jest.fn();
      const onEnterYellow = jest.fn();

      const fsm = new FSM(null)
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

    test("executes onExit when stopping", () => {
      const onExitRed = jest.fn();
      const onExitGreen = jest.fn();
      const onExitYellow = jest.fn();

      const fsm = new FSM(null)
        .addState("red")
        .addState("yellow")
        .addState("green")

        .onExit("red", onExitRed)
        .onExit("yellow", onExitYellow)
        .onExit("green", onExitGreen);

      fsm.start();

      expect(onExitRed).not.toBeCalled();
      expect(onExitYellow).not.toBeCalled();
      expect(onExitGreen).not.toBeCalled();

      fsm.stop();

      expect(onExitRed).toBeCalledTimes(1);
      expect(onExitYellow).not.toBeCalled();
      expect(onExitGreen).not.toBeCalled();
    });

    test("executes onEnter after onExit when transitioning", () => {
      const calls: string[] = [];

      const enterGreen = () => void calls.push("entered green");
      const enterRed = () => void calls.push("entered red");
      const enterYellow = () => void calls.push("entered yellow");
      const exitGreen = () => void calls.push("exited green");
      const exitYellow = () => void calls.push("exited yellow");
      const exitRed = () => void calls.push("exited red");

      const fsm = new FSM(null)
        .addState("red")
        .addState("yellow")
        .addState("green")

        .onEnter("red", enterRed)
        .onEnter("yellow", enterYellow)
        .onEnter("green", enterGreen)

        .onExit("red", exitRed)
        .onExit("yellow", exitYellow)
        .onExit("green", exitGreen)

        .addTransitions("green", {
          STAY_GREEN_LONGER: () => "green",
          BE_CAREFUL: () => "yellow",
        })

        .addTransitions("red", {
          TO_GREEN: () => "green",
        })

        .addTransitions("yellow", {
          TO_RED: () => "redd",
        })

        .start();

      expect(fsm.currentState).toEqual("red");
      expect(calls).toEqual(["entered red"]);

      fsm.send({ type: "TO_GREEN" });
      expect(fsm.currentState).toEqual("green");
      expect(calls).toEqual(["entered red", "exited red", "entered green"]);

      // No enter/exit events happen when staying in the same state explicitly
      fsm.send({ type: "STAY_GREEN_LONGER" });
      expect(fsm.currentState).toEqual("green");
      fsm.send({ type: "STAY_GREEN_LONGER" });
      expect(fsm.currentState).toEqual("green");
      expect(calls).toEqual(["entered red", "exited red", "entered green"]);

      expect(() => fsm.send({ type: "TO_RED" })).toThrow(
        'Event "TO_RED" is not allowed from state "green"'
      );
      expect(fsm.currentState).toEqual("green");

      expect(fsm.can("TO_RED")).toBe(false);
      expect(fsm.can("BE_CAREFUL")).toBe(true);

      fsm.send({ type: "BE_CAREFUL" });
      expect(fsm.currentState).toEqual("yellow");
      expect(calls).toEqual([
        "entered red",
        "exited red",
        "entered green",
        "exited green",
        "entered yellow",
      ]);
    });

    test("does not execute onExit/onEnter events when explicitly staying in the same state", () => {
      const calls: string[] = [];

      const enterGreen = () => void calls.push("entered green");
      const exitGreen = () => void calls.push("exited green");

      const fsm = new FSM(null)
        .addState("green")

        .onEnter("green", enterGreen)
        .onExit("green", exitGreen)

        .addTransitions("green", {
          DO_NOTHING: () => "green",
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

      const fsm = new FSM(null)
        .addState("off")
        .addState("on")

        .onEnter("on", onEnterWithCleanup)

        .addTransitions("on", {
          TOGGLE: () => "off",
        })

        .addTransitions("off", {
          TOGGLE: () => "on",
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

      const fsm = new FSM(null)
        .addState("initial")
        .addState("group.red")
        .addState("group.yellow")
        .addState("group.green")
        .addState("error")

        .addTransitions("*", { ERROR: () => "error" })
        .addTransitions("initial", { START: () => "group.red" })
        .addTransitions("group.red", { NEXT: () => "group.yellow" })
        .addTransitions("group.yellow", { NEXT: () => "group.green" })
        .addTransitions("group.green", { NEXT: () => "group.red" })

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
    const fsm = new FSM(null)
      .addState("foo.one")
      .addState("foo.two")
      .addState("bar.three")

      .addTransitions("*", {
        FROM_ANYWHERE: () => "foo.two",
      })

      .addTransitions("foo.*", {
        FROM_FOO_ONLY: () => "bar.three",
      })

      .start();

    expect(fsm.currentState).toEqual("foo.one");
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.two");
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.two");
    fsm.send({ type: "FROM_FOO_ONLY" });
    expect(fsm.currentState).toEqual("bar.three");
    expect(() => fsm.send({ type: "FROM_FOO_ONLY" })).toThrow(
      'Event "FROM_FOO_ONLY" is not allowed from state "bar.three"'
    );
    fsm.send({ type: "FROM_ANYWHERE" });
    expect(fsm.currentState).toEqual("foo.two");
  });

  // TODO Nice to have, no need to fix this right now yet
  test.skip("wildcards cannot overwrite existing transitions", () => {
    const fsm = new FSM(null)
      .addState("foo.start")
      .addState("foo.mid")
      .addState("foo.end")

      .addTransitions("foo.start", {
        FROM_ANYWHERE: () => "foo.mid",
      })

      .addTransitions("foo.mid", {
        FROM_ANYWHERE: () => "foo.end",
      })

      // This wildcard should _not_ override the transitions defined above
      .addTransitions("*", {
        FROM_ANYWHERE: () => "foo.start",
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

  // describe("promise-based states", () => {
  //   test("normal flow", async () => {
  //     const calls: string[] = [];

  //     function fromPromise<T>(config: {
  //       promiseFactory: (context: T) => Promise<unknown>;
  //       onDone?: /* EventName */ string;
  //       onError?: /* EventName */ string;
  //     }) {
  //       function generatedOnEnter(context: T) {
  //         let cancelled = false;

  //         const promise = config.promiseFactory(context);
  //         promise.then(
  //           (_result) => {
  //             if (!cancelled && config.onDone && fsm.can(config.onDone)) {
  //               fsm.send(config.onDone);
  //             }
  //           },
  //           (_error) => {
  //             if (!cancelled && config.onError && fsm.can(config.onError)) {
  //               fsm.send(config.onError);
  //             }
  //           }
  //         );

  //         return () => {
  //           cancelled = true;
  //         };
  //       }
  //       return generatedOnEnter;
  //     }

  //     function somePromise() {
  //       calls.push("promise started");
  //       return new Promise((resolve) => {
  //         setTimeout(() => {
  //           calls.push("promise done");
  //           return resolve(undefined);
  //         }, 0);
  //       });
  //     }

  //     const fsm = new FSM(
  //       {},
  //       {
  //         running: {
  //           initial: true,
  //           onEnter: fromPromise({
  //             promiseFactory: somePromise,
  //             onDone: "DONE",
  //             onError: "ERROR",
  //           }),
  //           on: {
  //             DONE: "resolved",
  //             ERROR: "rejected",
  //           },
  //         },

  //         resolved: {},
  //         rejected: {},
  //       }
  //     );

  //     expect(fsm.currentStateName).toEqual("running");
  //     expect(calls).toEqual(["promise started"]);

  //     return new Promise((resolve) => {
  //       setTimeout(() => {
  //         expect(calls).toEqual(["promise started", "promise done"]);
  //         expect(fsm.currentStateName).toEqual("resolved");
  //         resolve(undefined);
  //       }, 0);
  //     });
  //   });

  //   test("cancelling promises", async () => {
  //     const calls: string[] = [];

  //     function fromPromise<T>(config: {
  //       promiseFactory: (context: T) => Promise<unknown>;
  //       onDone?: /* EventName */ string;
  //       onError?: /* EventName */ string;
  //     }) {
  //       function generatedOnEnter(context: T) {
  //         let cancelled = false;

  //         const promise = config.promiseFactory(context);
  //         promise.then(
  //           (_result) => {
  //             if (!cancelled && config.onDone && fsm.can(config.onDone)) {
  //               fsm.send(config.onDone);
  //             }
  //           },
  //           (_error) => {
  //             if (!cancelled && config.onError && fsm.can(config.onError)) {
  //               fsm.send(config.onError);
  //             }
  //           }
  //         );

  //         return () => {
  //           cancelled = true;
  //         };
  //       }
  //       return generatedOnEnter;
  //     }

  //     function somePromise() {
  //       calls.push("promise started");
  //       return new Promise((resolve) => {
  //         setTimeout(() => {
  //           calls.push("promise done");
  //           return resolve(undefined);
  //         }, 0);
  //       });
  //     }

  //     const fsm = new FSM(
  //       {},
  //       {
  //         running: {
  //           initial: true,
  //           onEnter: fromPromise({
  //             promiseFactory: somePromise,
  //             onDone: "DONE",
  //             onError: "ERROR",
  //           }),
  //           on: {
  //             DONE: "resolved",
  //             ERROR: "rejected",
  //             ABORT: "rejected",
  //           },
  //         },

  //         resolved: {},
  //         rejected: {
  //           on: {
  //             DONE: () => {
  //               throw new Error("Should never get triggered");
  //             },
  //             ABORT: "rejected",
  //           },
  //         },
  //       }
  //     );

  //     expect(fsm.currentStateName).toEqual("running");
  //     expect(calls).toEqual(["promise started"]);

  //     // Immediately move out of the state, which should "cancel" the promise
  //     fsm.send("ABORT");

  //     return new Promise((resolve) => {
  //       setTimeout(() => {
  //         expect(calls).toEqual(["promise started", "promise done"]);
  //         expect(fsm.currentStateName).toEqual("rejected");
  //         resolve(undefined);
  //       }, 0);
  //     });
  //   });
  // });
});

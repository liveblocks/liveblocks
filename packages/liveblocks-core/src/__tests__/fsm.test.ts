import { FiniteStateMachine as FSM } from "../fsm";

describe("finite state machine", () => {
  test("cannot start before there is at least an initial state", () => {
    const fsm = new FSM(null).addEvent("x").addEvent("y");
    expect(() => fsm.start()).toThrow("No states defined yet");
  });

  test("cannot use FSM when it hasn't started yet", () => {
    const fsm = new FSM(null);
    expect(() => fsm.transition({ type: "SOME_EVENT" })).toThrow(
      "Machine hasn't started yet"
    );
  });

  test("cannot use FSM when it hasn't started yet", () => {
    const fsm = new FSM(null)
      .addState({ name: "red" })
      .addState({ name: "yellow" })
      .addState({ name: "green" });

    expect(() => fsm.currentStateName).toThrow("Machine hasn't started yet");
  });

  test("error when there is an nonexisting target state", () => {
    const fsm = new FSM(null)
      .addEvent("SOME_EVENT")
      .addState({ name: "initial" })
      .addTransitions("initial", {
        SOME_EVENT: () => "i-am-not-a-valid-state-name",
      })
      .start();

    expect(() => {
      fsm.transition({ type: "SOME_EVENT" });
    }).toThrow('Invalid next state name: "i-am-not-a-valid-state-name"');
  });

  test("initial state", () => {
    const fsm = new FSM(null)
      .addState({ name: "red" })
      .addState({ name: "yellow" })
      .addState({ name: "green" })
      .start();

    expect(fsm.currentStateName).toBe("red");
  });

  test("transitionIfPossible never errors when target state does not exist", () => {
    const fsm = new FSM(null)
      .addEvent("INVALID")
      .addEvent("ONLY_WHEN_RED")
      .addEvent("ONLY_WHEN_GREEN")

      .addState({ name: "red" })
      .addState({ name: "green" })

      .addTransitions("red", {
        INVALID: () => "i-am-not-a-valid-state-name",
        ONLY_WHEN_RED: () => "green",
      })

      .addTransitions("green", {
        ONLY_WHEN_GREEN: () => "red",
      })

      .start();

    expect(() => fsm.transition({ type: "UNKNOWN_EVENT" })).toThrow(
      'Unknown event "UNKNOWN_EVENT"'
    );

    expect(() => fsm.transition({ type: "INVALID" })).toThrow(
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );

    expect(fsm.currentStateName).toBe("red");

    expect(() => fsm.transition({ type: "ONLY_WHEN_GREEN" })).toThrow(
      'Event "ONLY_WHEN_GREEN" is not allowed from state "red"'
    );
    expect(() =>
      fsm.transitionIfPossible({ type: "ONLY_WHEN_GREEN" })
    ).not.toThrow();
    expect(fsm.currentStateName).toBe("red"); // Doesn't change the state

    fsm.transitionIfPossible({ type: "ONLY_WHEN_RED" }); // Acts like .transition()
    expect(fsm.currentStateName).toBe("green");

    fsm.transitionIfPossible({ type: "ONLY_WHEN_GREEN" });

    // Still fails (because this is a configuration error)
    expect(() => fsm.transitionIfPossible({ type: "INVALID" })).toThrow(
      'Invalid next state name: "i-am-not-a-valid-state-name"'
    );
  });

  test("executes onEnter directly when starting", () => {
    const onEnterRed = jest.fn();
    const onEnterGreen = jest.fn();
    const onEnterYellow = jest.fn();

    const fsm = new FSM(null)
      .addState({ name: "red", onEnter: onEnterRed })
      .addState({ name: "yellow", onEnter: onEnterYellow })
      .addState({ name: "green", onEnter: onEnterGreen });

    expect(onEnterRed).not.toBeCalled();
    expect(onEnterYellow).not.toBeCalled();
    expect(onEnterGreen).not.toBeCalled();

    fsm.start();

    expect(onEnterRed).toBeCalledTimes(1);
    expect(onEnterYellow).not.toBeCalled();
    expect(onEnterGreen).not.toBeCalled();
  });

  test("executes onExit directly when stopping", () => {
    const onExitRed = jest.fn();
    const onExitGreen = jest.fn();
    const onExitYellow = jest.fn();

    const fsm = new FSM(null)
      .addState({ name: "red", onExit: onExitRed })
      .addState({ name: "yellow", onExit: onExitYellow })
      .addState({ name: "green", onExit: onExitGreen });

    fsm.start();

    expect(onExitRed).not.toBeCalled();
    expect(onExitYellow).not.toBeCalled();
    expect(onExitGreen).not.toBeCalled();

    fsm.stop();

    expect(onExitRed).toBeCalledTimes(1);
    expect(onExitYellow).not.toBeCalled();
    expect(onExitGreen).not.toBeCalled();
  });

  test("executes onEnter after onExit", () => {
    const calls: string[] = [];

    const enterGreen = () => void calls.push("entered green");
    const enterRed = () => void calls.push("entered red");
    const enterYellow = () => void calls.push("entered yellow");
    const exitGreen = () => void calls.push("exited green");
    const exitYellow = () => void calls.push("exited red");
    const exitRed = () => void calls.push("exited yellow");

    const fsm = new FSM(null)
      .addEvent("TO_RED")
      .addEvent("TO_GREEN")
      .addEvent("STAY_GREEN_LONGER")
      .addEvent("BE_CAREFUL")

      .addState({ name: "red", onEnter: enterRed, onExit: exitYellow })
      .addState({ name: "yellow", onEnter: enterYellow, onExit: exitRed })
      .addState({ name: "green", onEnter: enterGreen, onExit: exitGreen })

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

    expect(fsm.currentStateName).toEqual("red");
    expect(calls).toEqual(["entered red"]);

    fsm.transition({ type: "TO_GREEN" });
    expect(fsm.currentStateName).toEqual("green");
    expect(calls).toEqual(["entered red", "exited red", "entered green"]);

    // No enter/exit events happen when staying in the same state explicitly
    fsm.transition({ type: "STAY_GREEN_LONGER" });
    expect(fsm.currentStateName).toEqual("green");
    fsm.transition({ type: "STAY_GREEN_LONGER" });
    expect(fsm.currentStateName).toEqual("green");
    expect(calls).toEqual(["entered red", "exited red", "entered green"]);

    expect(() => fsm.transition({ type: "TO_RED" })).toThrow(
      'Event "TO_RED" is not allowed from state "green"'
    );
    expect(fsm.currentStateName).toEqual("green");

    expect(fsm.can("TO_RED")).toBe(false);
    expect(fsm.can("BE_CAREFUL")).toBe(true);

    fsm.transition({ type: "BE_CAREFUL" });
    expect(fsm.currentStateName).toEqual("yellow");
    expect(calls).toEqual([
      "entered red",
      "exited red",
      "entered green",
      "exited green",
      "entered yellow",
    ]);
  });

  test("states with cleanup functions", () => {
    const calls: string[] = [];

    const onEnter = () => {
      calls.push("light!");
      return () => {
        calls.push("darkness!");
      };
    };

    const fsm = new FSM(null)
      .addState({ name: "off" })
      .addState({ name: "on", onEnter })

      .addTransitions("on", {
        TOGGLE: () => "off",
      })

      .addTransitions("off", {
        TOGGLE: () => "on",
      })

      .start();

    expect(fsm.currentStateName).toEqual("off");
    expect(calls).toEqual([]);

    fsm.transition({ type: "TOGGLE" });
    expect(fsm.currentStateName).toEqual("on");
    expect(calls).toEqual(["light!"]);

    fsm.transition({ type: "TOGGLE" });
    expect(fsm.currentStateName).toEqual("off");
    expect(calls).toEqual(["light!", "darkness!"]);

    fsm.transition({ type: "TOGGLE" });
    expect(fsm.currentStateName).toEqual("on");
    expect(calls).toEqual(["light!", "darkness!", "light!"]);

    fsm.stop();
    expect(calls).toEqual(["light!", "darkness!", "light!", "darkness!"]);
  });

  test("using wildcards to describe transitions", () => {
    const fsm = new FSM(null)
      .addEvent("FROM_ANYWHERE")
      .addEvent("FROM_FOO_ONLY")

      .addState({ name: "foo.one" })
      .addState({ name: "foo.two" })
      .addState({ name: "bar.three" })

      .addTransitions("*", {
        FROM_ANYWHERE: () => "foo.two",
      })

      .addTransitions("foo.*", {
        FROM_FOO_ONLY: () => "bar.three",
      })

      .start();

    expect(fsm.currentStateName).toEqual("foo.one");
    fsm.transition({ type: "FROM_ANYWHERE" });
    expect(fsm.currentStateName).toEqual("foo.two");
    fsm.transition({ type: "FROM_ANYWHERE" });
    expect(fsm.currentStateName).toEqual("foo.two");
    fsm.transition({ type: "FROM_FOO_ONLY" });
    expect(fsm.currentStateName).toEqual("bar.three");
    expect(() => fsm.transition({ type: "FROM_FOO_ONLY" })).toThrow(
      'Event "FROM_FOO_ONLY" is not allowed from state "bar.three"'
    );
    fsm.transition({ type: "FROM_ANYWHERE" });
    expect(fsm.currentStateName).toEqual("foo.two");
  });

  // TODO Nice to have, no need to fix this right now yet
  test.skip("wildcards cannot overwrite existing transitions", () => {
    const fsm = new FSM(null)
      .addState({ name: "foo.start" })
      .addState({ name: "foo.mid" })
      .addState({ name: "foo.end" })

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

    expect(fsm.currentStateName).toEqual("foo.start");
    fsm.transition({ type: "FROM_ANYWHERE" });
    expect(fsm.currentStateName).toEqual("foo.mid");
    fsm.transition({ type: "FROM_ANYWHERE" });
    expect(fsm.currentStateName).toEqual("foo.end");
    fsm.transition({ type: "FROM_ANYWHERE" });
    expect(fsm.currentStateName).toEqual("foo.start");
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
  //               fsm.transition(config.onDone);
  //             }
  //           },
  //           (_error) => {
  //             if (!cancelled && config.onError && fsm.can(config.onError)) {
  //               fsm.transition(config.onError);
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
  //               fsm.transition(config.onDone);
  //             }
  //           },
  //           (_error) => {
  //             if (!cancelled && config.onError && fsm.can(config.onError)) {
  //               fsm.transition(config.onError);
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
  //     fsm.transition("ABORT");

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

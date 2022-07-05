import { createRoomContext } from "@liveblocks/react";
import randomNumber from "../../utils/randomNumber";
import React, { useRef } from "react";
import { LiveObject, LiveMap, LiveList, shallow } from "@liveblocks/client";
import createLiveblocksClient from "../../utils/createClient";
import { nanoid } from "nanoid";

const client = createLiveblocksClient();

const { RoomProvider, useBatch, useSelector, useObject } = createRoomContext<
  never,
  {
    version: number;
    nest1: LiveObject<{
      nest2: LiveObject<{
        a: LiveList<string>;
        b: LiveList<number>;
        c: LiveMap<string, LiveObject<{ x: number; y: number }>>;
      }>;
    }>;
  }
>(client);

function useRenderCount() {
  const count = useRef(1);
  return count.current++;
}

export default function Home() {
  let roomId = "e2e-storage-selector-test";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }
  return (
    <RoomProvider
      id={roomId}
      initialStorage={() => ({
        version: 1.0,
        nest1: new LiveObject({
          nest2: new LiveObject({
            a: new LiveList(["🦊", "🦍", "🐍"]),
            b: new LiveList([13, 42, 3.1415]),
            c: new LiveMap([["abc", new LiveObject({ x: 1, y: 2 })]]),
          }),
        }),
      })}
    >
      <div>
        <Toolbar />
        <hr />
        <div style={{ display: "flex" }}>
          <div style={{ padding: 10, background: "#efefef" }}>
            <h1>Version</h1>
            <Version />
          </div>
          <div style={{ padding: 10, background: "#eaeaea" }}>
            <h1>A</h1>
            <A />
            <hr />
            <AFilter />
          </div>
          <div style={{ padding: 10, background: "#efefef" }}>
            <h1>B</h1>
            <B />
            <hr />
            <BOnlyEvens />
            <hr />
            <BOnlyOdds />
          </div>
          <div style={{ padding: 10, background: "#eaeaea" }}>
            <h1>C</h1>
            <C />
          </div>
          <div style={{ padding: 10, background: "#efefef" }}>
            <h1>Full root</h1>
            <Full />
          </div>
        </div>
      </div>
    </RoomProvider>
  );
}

function Toolbar() {
  const renderCount = useRenderCount();
  const mutableNestedOrNull = useObject("nest1")?.get("nest2") ?? null;
  const batch = useBatch();

  if (mutableNestedOrNull == null) {
    return <div>Loading {renderCount}</div>;
  }

  const mutableNested = mutableNestedOrNull;

  return (
    <div>
      <div>
        <button
          id="addA"
          onClick={() => {
            const mutableA = mutableNested.get("a");
            mutableA.push(nanoid(7));
          }}
        >
          Add to A (at end)
        </button>

        <button
          id="addB"
          onClick={() => {
            const mutableB = mutableNested.get("b");
            mutableB.insert(Math.floor(1_000_000 * Math.random()), 0);
          }}
        >
          Add to B (at start)
        </button>

        <button
          id="addC"
          onClick={() => {
            const mutableC = mutableNested.get("c");
            const id = nanoid(7);
            mutableC.set(
              id,
              new LiveObject({
                x: Math.floor(10 - 20 * Math.random()),
                y: Math.floor(10 - 20 * Math.random()),
              })
            );
          }}
        >
          Add to C
        </button>

        <button
          id="addAll"
          onClick={() => {
            batch(() => {
              const mutableA = mutableNested.get("a");
              const mutableB = mutableNested.get("b");
              const mutableC = mutableNested.get("c");

              const id = nanoid(7);

              mutableA.push(id);

              mutableB.insert(Math.floor(1_000_000 * Math.random()), 0);

              mutableC.set(
                id,
                new LiveObject({
                  x: Math.floor(10 - 20 * Math.random()),
                  y: Math.floor(10 - 20 * Math.random()),
                })
              );
            });
          }}
        >
          Add to all
        </button>
      </div>

      <div>
        <button
          id="deleteA"
          onClick={() => {
            const mutableA = mutableNested.get("a");
            if (mutableA.length === 0) return;

            const index = randomNumber(mutableA.length);
            mutableA.delete(index);
          }}
        >
          Delete from A (random)
        </button>

        <button
          id="deleteB"
          onClick={() => {
            const mutableB = mutableNested.get("b");
            if (mutableB.length === 0) return;

            const index = randomNumber(mutableB.length);
            mutableB.delete(index);
          }}
        >
          Delete from B (random)
        </button>

        <button
          id="deleteC"
          onClick={() => {
            const mutableC = mutableNested.get("c");
            const keys = Array.from(mutableC.keys());
            if (keys.length === 0) return;

            const index = randomNumber(keys.length);
            const key = keys[index];
            mutableC.delete(key);
          }}
        >
          Delete from C (random)
        </button>
      </div>
    </div>
  );
}

function A() {
  const renderCount = useRenderCount();
  const a = useSelector((root) => root.nest1.nest2.a);

  if (a == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
      {JSON.stringify({ renderCount, nest1: { nest2: { a } } }, null, 2)}
    </pre>
  );
}

function AFilter() {
  const renderCount = useRenderCount();
  const [q, setQ] = React.useState("");

  const matches = useSelector(
    (root) =>
      root.nest1.nest2.a.filter((item) => q && item.toLowerCase().includes(q)),

    // Note: `shallow` comparison necessary because `.filter()` will return a new array on every invocation
    shallow
  );

  if (matches == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value.toLowerCase())}
      />

      <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
        {JSON.stringify({ renderCount, q, matches }, null, 2)}
      </pre>
    </div>
  );
}

function B() {
  const renderCount = useRenderCount();
  const b = useSelector((root) => root.nest1.nest2.b);

  if (b == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <div style={{ minHeight: 300 }}>
      <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
        {JSON.stringify({ renderCount, nest1: { nest2: { b } } }, null, 2)}
      </pre>
    </div>
  );
}

function BOnlyEvens() {
  const renderCount = useRenderCount();
  const evens = useSelector(
    (root) => root.nest1.nest2.b.filter((n) => n % 2 === 0),
    // Note: `shallow` comparison necessary because `.filter()` will return a new array on every invocation
    shallow
  );

  if (evens == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <div style={{ minHeight: 200 }}>
      <strong>Only evens</strong>
      <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
        {JSON.stringify({ renderCount, evens }, null, 2)}
      </pre>
    </div>
  );
}

function BOnlyOdds() {
  const renderCount = useRenderCount();
  const odds = useSelector(
    (root) => root.nest1.nest2.b.filter((n) => n % 2 !== 0),
    // Note: `shallow` comparison necessary because `.filter()` will return a new array on every invocation
    shallow
  );

  if (odds == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <div style={{ minHeight: 200 }}>
      <strong>Only odds</strong>
      <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
        {JSON.stringify({ renderCount, odds }, null, 2)}
      </pre>
    </div>
  );
}

function C() {
  const renderCount = useRenderCount();
  const c = useSelector((root) => root.nest1.nest2.c);

  if (c == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
      {JSON.stringify({ renderCount, nest1: { nest2: { c } } }, null, 2)}
    </pre>
  );
}

function Version() {
  const renderCount = useRenderCount();
  const version = useSelector((root) => root.version);

  if (version == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
      {JSON.stringify({ renderCount, version }, null, 2)}
    </pre>
  );
}

function Full() {
  const renderCount = useRenderCount();
  const root = useSelector((root) => root);

  if (root == null) {
    return <div>Loading {renderCount}</div>;
  }

  return (
    <pre id="list" style={{ fontSize: 10, whiteSpace: "pre" }}>
      {JSON.stringify({ renderCount, root }, null, 2)}
    </pre>
  );
}

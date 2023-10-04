import React from "react";
import type { Json } from "@liveblocks/client";

/**
 * Generates a stable yet unique key to use for this test run, so it won't
 * conflict with other E2E tests running simultaneously.
 */
export function genRoomId(testTitle: string) {
  testTitle = testTitle.toLowerCase();
  if (testTitle.startsWith("e2e-")) {
    testTitle = testTitle.slice(4);
  }
  const prefix = process.env.NEXT_PUBLIC_GITHUB_SHA
    ? `${process.env.NEXT_PUBLIC_GITHUB_SHA.slice(0, 2)}`
    : "local";
  return `e2e-${prefix.toLowerCase()}-${testTitle
    .replaceAll(/[^\w\d_-]+/g, "-")
    .replaceAll(/--+/g, "-")}`;
}

export function getRoomFromUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const q = new URL(window.location.href).searchParams;
  return q.get("room") ?? undefined;
}

export function randomInt(max: number) {
  if (max <= 0) {
    throw new Error("max should be more than 0");
  }
  return Math.floor(Math.random() * max);
}

export function randomIndices(array: { length: number }): [number, number] {
  if (array.length < 2) {
    throw new Error(
      `cannot sample two random indexes from an array of only ${array.length} items`
    );
  }

  const ri1 = randomInt(array.length);
  let ri2 = randomInt(array.length - 1);
  if (ri2 >= ri1) {
    ri2++;
  }
  return [ri1, ri2];
}

export function useRenderCount() {
  const ref = React.useRef(0);
  return ++ref.current;
}

export function opaqueIf(condition: boolean): { opacity?: number } {
  return { opacity: condition ? undefined : 0.7 };
}

// A predefined mono style
export const styles = {
  mono: { fontFamily: "monospace", whiteSpace: "pre" },
  dataTable: { margin: "20px 0" },
} as const;

export type RowProps = {
  readonly id: string;
  readonly name: string;
  readonly value: Readonly<Json> | undefined;
  readonly style?: Record<string, unknown>;
};

export function Row(props: RowProps) {
  return (
    <tr>
      <td width={150} valign="top">
        {props.name}:
      </td>
      <td
        id={props.id}
        valign="top"
        style={{ ...styles.mono, ...props.style }}
        title={`#${props.id}`}
      >
        {props.value !== undefined ? (
          JSON.stringify(props.value, null, 2)
        ) : (
          <span style={{ opacity: 0.5, fontStyle: "italic" }}>undefined</span>
        )}
      </td>
    </tr>
  );
}

import type { Json } from "@liveblocks/client";
import React from "react";

export function getRoomFromUrl(): string {
  if (typeof window === "undefined") {
    return "room-id-placeholder-for-ssr";
  }

  const q = new URL(window.location.href).searchParams;
  const room = q.get("room");
  if (!room) {
    throw new Error("Specify ?room= in URL, please");
  }
  return room;
}

/**
 * Pads a string to the left or right, depending on whether the connection is
 * even or odd.
 *
 * While this may look strange, it's a very lo-fi way of seeing
 * instantly/visually which of the two clients an item is coming from.
 */
export function padItem(connectionId: number, value: string) {
  return connectionId % 2 === 0
    ? `${connectionId}:${value}       `
    : `       ${connectionId}:${value}`;
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
      <td width={150} valign="top" style={{ ...styles.mono }}>
        #{props.id}
      </td>
      <td width={30} valign="top" style={{ fontSize: ".8rem" }}>
        →
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

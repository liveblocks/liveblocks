import type { Json } from "@liveblocks/core";

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
    .replaceAll(/[^\w_-]+/g, "-")
    .replaceAll(/--+/g, "-")}`;
}

export function getRoomFromUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const q = new URL(window.location.href).searchParams;
  return q.get("room") ?? undefined;
}

// A predefined mono style
export const styles = {
  mono: { fontFamily: "monospace", whiteSpace: "pre" },
  dataTable: { margin: "20px 0" },
} as const;

export type RowProps = {
  readonly id: string;
  readonly name: string;
  readonly value?: Readonly<Json>;
};

export function Row(props: RowProps) {
  return (
    <tr>
      <td width={150} valign="top">
        {props.name}:
      </td>
      <td id={props.id} valign="top" style={styles.mono} title={`#${props.id}`}>
        {props.value !== undefined ? (
          JSON.stringify(props.value, null, 2)
        ) : (
          <span style={{ opacity: 0.5, fontStyle: "italic" }}>undefined</span>
        )}
      </td>
    </tr>
  );
}

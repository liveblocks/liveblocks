import {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
} from "../liveblocks.config";
import { useRouter } from "next/router";
import React, { useMemo } from "react";
import Selection from "../components/Selection";
import styles from "./index.module.css";

/**
 * This file shows how to add basic live selection on your forms.
 */

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];
const NAMES = ["User A", "User B", "User C", "User D", "User E"];

function Selections({ id }: { id: string }) {
  const users = useOthers();

  return (
    <>
      {users.map(({ connectionId, presence }) => {
        if (presence.selectedId === id) {
          return (
            <Selection
              key={connectionId}
              name={NAMES[connectionId % NAMES.length]}
              color={COLORS[connectionId % COLORS.length]}
            />
          );
        }
      })}
    </>
  );
}

function Example() {
  const updateMyPresence = useUpdateMyPresence();

  return (
    <div className={styles.container}>
      <div className={styles.form_container}>
        <div className={styles.form_content}>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <h2 className={styles.heading}>Live selection form</h2>
            <p className={styles.description}>
              This is a basic online form that shows what input other people
              currently have selected.
            </p>

            <div className={styles.form_group}>
              <label className={styles.label}>Input 1</label>

              <div className={styles.selection_container}>
                <input
                  id="input-1"
                  type="text"
                  className={styles.input}
                  onFocus={(e) => updateMyPresence({ selectedId: e.target.id })}
                  onBlur={() => updateMyPresence({ selectedId: null })}
                  maxLength={20}
                />
                <Selections id="input-1" />
              </div>
            </div>

            <div className={styles.form_group}>
              <label className={styles.label}>Input 2</label>

              <div className={styles.selection_container}>
                <input
                  id="input-2"
                  type="text"
                  className={styles.input}
                  onFocus={(e) => updateMyPresence({ selectedId: e.target.id })}
                  onBlur={() => updateMyPresence({ selectedId: null })}
                  maxLength={20}
                />
                <Selections id="input-2" />
              </div>
            </div>

            <div className={styles.form_group}>
              <label className={styles.label}>Input 3</label>

              <div className={styles.selection_container}>
                <input
                  id="input-3"
                  type="text"
                  className={styles.input}
                  onFocus={(e) => updateMyPresence({ selectedId: e.target.id })}
                  onBlur={() => updateMyPresence({ selectedId: null })}
                  maxLength={20}
                />
                <Selections id="input-3" />
              </div>
            </div>

            <div className={styles.form_group}>
              <label className={styles.label}>Input 4</label>

              <div className={styles.selection_container}>
                <input
                  id="input-4"
                  type="text"
                  className={styles.input}
                  onFocus={(e) => updateMyPresence({ selectedId: e.target.id })}
                  onBlur={() => updateMyPresence({ selectedId: null })}
                  maxLength={20}
                />
                <Selections id="input-4" />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const roomId = useExampleRoomId("nextjs-live-form-selection");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        selectedId: null,
      }}
    >
      <Example />
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-form-selection#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-form-selection#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const { query } = useRouter();
  const exampleRoomId = useMemo(() => {
    return query?.exampleId ? `${roomId}-${query.exampleId}` : roomId;
  }, [query, roomId]);

  return exampleRoomId;
}

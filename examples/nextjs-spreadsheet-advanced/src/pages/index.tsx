import { useRouter } from "next/router";
import { CSSProperties, useMemo } from "react";
import { RoomProvider, useHistory } from "../liveblocks.config";
import { useSpreadsheet } from "../spreadsheet/react";
import { appendUnit } from "../utils";
import {
  AddColumnAfterIcon,
  AddRowAfterIcon,
  UndoIcon,
  RedoIcon,
} from "../icons";
import { Avatar } from "../components/Avatar";
import { createInitialStorage } from "../spreadsheet/utils";
import { Tooltip } from "../components/Tooltip";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import styles from "./index.module.css";
import {
  COLUMN_HEADER_WIDTH,
  COLUMN_INITIAL_WIDTH,
  GRID_INITIAL_COLUMNS,
  GRID_INITIAL_ROWS,
  ROW_INITIAL_HEIGHT,
} from "../constants";
import { Sheet } from "../components/Sheet";

function Example() {
  const spreadsheet = useSpreadsheet();
  const history = useHistory();

  if (spreadsheet == null) {
    return (
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        className={styles.loading}
      />
    );
  }

  const { users, columns, rows, insertColumn, insertRow } = spreadsheet;

  return (
    <main
      className={styles.container}
      style={
        {
          "--column-header-width": appendUnit(COLUMN_HEADER_WIDTH),
          "--column-width": appendUnit(COLUMN_INITIAL_WIDTH),
          "--row-height": appendUnit(ROW_INITIAL_HEIGHT),
        } as CSSProperties
      }
    >
      <div className={styles.banner}>
        <div className={styles.buttons}>
          <div className={styles.button_group} role="group">
            <Tooltip content="Add Column">
              <button
                className={styles.button}
                onClick={() =>
                  insertColumn(columns.length, COLUMN_INITIAL_WIDTH)
                }
              >
                <AddColumnAfterIcon />
              </button>
            </Tooltip>
            <Tooltip content="Add Row">
              <button
                className={styles.button}
                onClick={() => insertRow(rows.length, ROW_INITIAL_HEIGHT)}
              >
                <AddRowAfterIcon />
              </button>
            </Tooltip>
          </div>
          <div className={styles.button_group} role="group">
            <Tooltip content="Undo">
              <button className={styles.button} onClick={() => history.undo()}>
                <UndoIcon />
              </button>
            </Tooltip>
            <Tooltip content="Redo">
              <button className={styles.button} onClick={() => history.redo()}>
                <RedoIcon />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className={styles.avatars}>
          {users.map(({ connectionId, info }) => {
            return (
              <Avatar
                key={connectionId}
                className={styles.avatar}
                src={info.url}
                name={info.name}
                color={info.color}
              />
            );
          })}
        </div>
      </div>
      <Sheet {...spreadsheet} />
    </main>
  );
}

const initialStorage = createInitialStorage(
  { length: GRID_INITIAL_COLUMNS, width: COLUMN_INITIAL_WIDTH },
  { length: GRID_INITIAL_ROWS, height: ROW_INITIAL_HEIGHT },
  [
    ["3", "", ""],
    ["=A1*3", "", ""],
    ["=A2%2", "", ""],
    ["=A2/4", "", ""],
  ]
);

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-spreadsheet-advanced");

  return (
    <RoomProvider
      id={roomId}
      initialStorage={initialStorage}
      initialPresence={{
        selectedCell: null,
      }}
    >
      <TooltipProvider>
        <Example />
      </TooltipProvider>
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-spreadsheet-advanced#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-spreadsheet-advanced#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}

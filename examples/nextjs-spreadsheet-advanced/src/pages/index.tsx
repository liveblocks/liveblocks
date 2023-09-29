import { TooltipProvider } from "@radix-ui/react-tooltip";
import cx from "classnames";
import { useRouter } from "next/router";
import { type CSSProperties, useMemo } from "react";
import { Avatar } from "../components/Avatar";
import { Sheet } from "../components/Sheet";
import { Tooltip } from "../components/Tooltip";
import {
  COLUMN_HEADER_WIDTH,
  COLUMN_INITIAL_WIDTH,
  GRID_INITIAL_COLUMNS,
  GRID_INITIAL_ROWS,
  GRID_MAX_COLUMNS,
  GRID_MAX_ROWS,
  ROW_INITIAL_HEIGHT,
} from "../constants";
import {
  AddColumnAfterIcon,
  AddRowAfterIcon,
  RedoIcon,
  UndoIcon,
} from "../icons";
import {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useHistory,
  useSelf,
} from "../liveblocks.config";
import { useSpreadsheet } from "../spreadsheet/react";
import { createInitialStorage } from "../spreadsheet/utils";
import { appendUnit } from "../utils/appendUnit";
import styles from "./index.module.css";

const AVATARS_MAX = 3;

function Example() {
  const spreadsheet = useSpreadsheet();
  const history = useHistory();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const self = useSelf();

  if (spreadsheet == null) {
    return (
      <img
        alt="Loading"
        className={styles.loading}
        src="https://liveblocks.io/loading.svg"
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
          "--accent": self?.info.color,
        } as CSSProperties
      }
    >
      <div className={styles.banner}>
        <div className={styles.banner_content}>
          <div className={styles.buttons}>
            <div className={styles.button_group} role="group">
              <button
                className={styles.button}
                disabled={rows.length >= GRID_MAX_ROWS}
                onClick={() => insertRow(rows.length, ROW_INITIAL_HEIGHT)}
              >
                <AddRowAfterIcon />
                <span>Add Row</span>
              </button>
              <button
                className={styles.button}
                disabled={columns.length >= GRID_MAX_COLUMNS}
                onClick={() =>
                  insertColumn(columns.length, COLUMN_INITIAL_WIDTH)
                }
              >
                <AddColumnAfterIcon />
                <span>Add Column</span>
              </button>
            </div>
            <div className={styles.button_group} role="group">
              <Tooltip content="Undo">
                <button
                  className={styles.button}
                  onClick={() => history.undo()}
                  disabled={!canUndo}
                >
                  <UndoIcon />
                </button>
              </Tooltip>
              <Tooltip content="Redo">
                <button
                  className={styles.button}
                  onClick={() => history.redo()}
                  disabled={!canRedo}
                >
                  <RedoIcon />
                </button>
              </Tooltip>
            </div>
          </div>
          <div className={styles.avatars}>
            {self && (
              <Avatar
                className={styles.avatar}
                color={self.info.color}
                key="you"
                name="You"
                src={self.info.avatar}
                tooltipOffset={6}
              />
            )}
            {users.slice(0, AVATARS_MAX - 1).map(({ connectionId, info }) => {
              return (
                <Avatar
                  className={styles.avatar}
                  color={info.color}
                  key={connectionId}
                  name={info.name}
                  src={info.avatar}
                  tooltipOffset={6}
                />
              );
            })}
            {users.length > AVATARS_MAX - 1 ? (
              <div className={cx(styles.avatar, styles.avatar_ellipsis)}>
                +{users.length - AVATARS_MAX + 1}
              </div>
            ) : null}
          </div>
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
    ["🔢 Entries", "👀 Results", ""],
    ["3", "=A2*3", ""],
    ["1234", "=(A2*A3+A4)/2", ""],
    ["-8", "=B3%2", ""],
    ["", "", ""],
  ]
);

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-spreadsheet-advanced");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        selectedCell: null,
      }}
      initialStorage={initialStorage}
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

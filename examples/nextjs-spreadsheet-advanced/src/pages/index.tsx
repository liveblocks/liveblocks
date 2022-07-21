import cx from "classnames";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { useRouter } from "next/router";
import { CSSProperties, useMemo } from "react";
import { CellData, Column, RoomProvider, Row } from "../../liveblocks.config";
import { Cell } from "../components/Cell";
import { useSpreadsheet } from "../hooks";
import { convertNumberToLetter } from "../interpreter/utils";
import { appendUnit } from "../utils";
import styles from "./index.module.css";

const GRID_INITIAL_ROWS = 6;
const GRID_INITIAL_COLUMNS = 4;
const COLUMN_HEADER_WIDTH = 80;
const COLUMN_INITIAL_WIDTH = 120;
const ROW_INITIAL_HEIGHT = 30;

function Example() {
  const spreadsheet = useSpreadsheet();

  if (spreadsheet == null) {
    return (
      <img
        src="https://liveblocks.io/loading.svg"
        alt="Loading"
        className={styles.loading}
      />
    );
  }

  const {
    columns,
    rows,
    cells,
    selectionMap,
    selectCell,
    deleteColumn,
    deleteRow,
    moveColumn,
    insertColumn,
    insertRow,
    getExpression,
    setCellValue,
  } = spreadsheet;

  return (
    <div
      className={styles.container}
      style={
        {
          "--column-header-width": COLUMN_HEADER_WIDTH,
          "--column-initial-width": COLUMN_INITIAL_WIDTH,
          "--row-initial-height": ROW_INITIAL_HEIGHT,
        } as CSSProperties
      }
    >
      <div className={styles.sheet_container}>
        <table className={styles.sheet}>
          <thead className={styles.sheet_header_row}>
            <tr
              style={{
                height: appendUnit(ROW_INITIAL_HEIGHT),
              }}
            >
              {columns.map((column, x) => (
                <th
                  key={column.id}
                  scope="col"
                  className={styles.sheet_header_cell}
                  style={{
                    width: appendUnit(column.width),
                  }}
                >
                  <div className={styles.sheet_header_label}>
                    {convertNumberToLetter(x)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={styles.sheet_header_column}>
            {rows.map((row, y) => {
              return (
                <tr key={y}>
                  <th
                    scope="row"
                    className={styles.sheet_header_cell}
                    style={{
                      width: appendUnit(COLUMN_HEADER_WIDTH),
                      height: appendUnit(row.height),
                    }}
                  >
                    <div className={styles.sheet_header_label}>{y}</div>
                  </th>
                </tr>
              );
            })}
          </tbody>
          <tbody className={styles.sheet_body}>
            {rows.map((row, y) => {
              return (
                <tr key={y}>
                  {columns.map((column, x) => {
                    return (
                      <td
                        key={x}
                        className={styles.cell}
                        style={{
                          width: appendUnit(column.width),
                          height: appendUnit(row.height),
                        }}
                        onClick={() =>
                          selectCell({ columnId: column.id, rowId: row.id })
                        }
                      >
                        <Cell
                          key={column.id + row.id}
                          onChange={(newValue) =>
                            setCellValue(column.id, row.id, newValue)
                          }
                          getExpression={() => getExpression(column.id, row.id)}
                          displayValue={cells[column.id + row.id]}
                          width={column.width}
                          height={row.height}
                          selectionColor={selectionMap[column.id + row.id]}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-spreadsheet-advanced");

  return (
    <RoomProvider
      id={roomId}
      initialStorage={{
        spreadsheet: new LiveObject({
          cells: new LiveMap<string, LiveObject<CellData>>(),
          rows: new LiveList<LiveObject<Row>>(
            Array.from(
              { length: GRID_INITIAL_ROWS },
              () => new LiveObject({ id: nanoid(), height: ROW_INITIAL_HEIGHT })
            )
          ),
          columns: new LiveList<LiveObject<Column>>(
            Array.from(
              { length: GRID_INITIAL_COLUMNS },
              () =>
                new LiveObject({ id: nanoid(), width: COLUMN_INITIAL_WIDTH })
            )
          ),
        }),
      }}
      initialPresence={{
        selectedCell: null,
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
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-spreadsheet-advanced#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
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

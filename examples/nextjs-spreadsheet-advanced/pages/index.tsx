import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { CellData, Column, RoomProvider, Row } from "../liveblocks.config";
import { Cell } from "../src/components/Cell";
import { useSpreadsheet } from "../src/hooks";
import styles from "./index.module.css";

const ROW_HEADER_WIDTH = 40;

function Example() {
  const spreadsheet = useSpreadsheet();

  if (spreadsheet == null) {
    return <div>Loading...</div>;
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
    <div className={styles.sheet_container}>
      <table className={styles.sheet} onBlur={() => selectCell(null)}>
        <colgroup>
          <col span={1} style={{ width: ROW_HEADER_WIDTH + "px" }} />
          {columns.map((column) => (
            <col span={1} style={{ width: column.width + "px" }} />
          ))}
        </colgroup>
        <tbody>
          <tr>
            <th style={{ width: ROW_HEADER_WIDTH + "px", height: "24px" }} />
            {columns.map((column, x) => {
              return (
                <th style={{ width: column.width + "px" }}>
                  <div className={`${styles.column_header} ${styles.hidden}`}>
                    {x > 0 && (
                      <button
                        className={styles.move_left}
                        onClick={() => moveColumn(x, x - 1)}
                      >
                        ←
                      </button>
                    )}
                    <button
                      className={styles.delete_column}
                      onClick={() => deleteColumn(x)}
                    >
                      ×
                    </button>
                    {x < columns.length - 1 && (
                      <button
                        className={styles.move_right}
                        onClick={() => moveColumn(x, x + 1)}
                      >
                        →
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
          {rows.map((row, y) => {
            return (
              <tr style={{ height: row.height + "px" }}>
                <th>
                  <button
                    className={`${styles.delete_row} ${styles.hidden}`}
                    onClick={() => deleteRow(y)}
                  >
                    ×
                  </button>
                </th>
                {columns.map((column, x) => {
                  return (
                    <td
                      className={styles.cell}
                      style={{
                        width: column.width + "px",
                        height: row.height + "px",
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
      <button
        className={`${styles.add_column} ${styles.hidden}`}
        onClick={() => insertColumn(columns.length, 100)}
      >
        +
      </button>
      <button
        className={`${styles.add_row} ${styles.hidden}`}
        onClick={() => insertRow(rows.length, 30)}
      >
        +
      </button>
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
          rows: new LiveList<LiveObject<Row>>([
            new LiveObject({ id: nanoid(), height: 30 }),
          ]),
          columns: new LiveList<LiveObject<Column>>([
            new LiveObject({ id: nanoid(), width: 100 }),
          ]),
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

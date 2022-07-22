import cx from "classnames";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { useRouter } from "next/router";
import { ComponentProps, CSSProperties, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
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

interface HeaderProps extends ComponentProps<"div"> {
  type: "row" | "column";
  header: Row | Column;
  index: number;
  onDelete: () => void;
}

interface HeadersProps extends ComponentProps<"div"> {
  type: "row" | "column";
  headers: (Row | Column)[];
  deleteHeader: (index: number) => void;
  moveHeader: (from: number, to: number) => void;
}

function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 4a1 1 0 1 0-2 0v5H4a1 1 0 0 0 0 2h5v5a1 1 0 1 0 2 0v-5h5a1 1 0 1 0 0-2h-5V4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HandlerIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM11 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM11 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM11 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CrossIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.707 4.707a1 1 0 0 0-1.414-1.414L8 6.586 4.707 3.293a1 1 0 0 0-1.414 1.414L6.586 8l-3.293 3.293a1 1 0 1 0 1.414 1.414L8 9.414l3.293 3.293a1 1 0 0 0 1.414-1.414L9.414 8l3.293-3.293Z"
        fill="currentColor"
      />
    </svg>
  );
}

function getIndexWithId<T extends { id: UniqueIdentifier }>(
  array: T[],
  id: UniqueIdentifier
) {
  return array.findIndex((element) => element.id === id);
}

function isRowHeader(header: Row | Column): header is Row {
  return Boolean((header as Row).height);
}

function isColumnHeader(header: Row | Column): header is Column {
  return Boolean((header as Column).width);
}

function Header({
  type,
  index,
  header,
  onDelete,
  style,
  ...props
}: HeaderProps) {
  const { listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({
      id: header.id,
    });
  const isColumn = isColumnHeader(header);

  return (
    <div
      key={header.id}
      ref={setNodeRef}
      className={styles.sheet_header}
      style={
        {
          "--header-width": isColumn ? appendUnit(header.width) : undefined,
          "--header-height": !isColumn ? appendUnit(header.height) : undefined,
          transform:
            isDragging && transform
              ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
              : undefined,
          zIndex: isDragging ? 100 : undefined,
        } as CSSProperties
      }
      {...props}
    >
      <button
        className={styles.sheet_header_control}
        ref={setActivatorNodeRef}
        {...listeners}
      >
        <HandlerIcon />
      </button>
      <span className={styles.sheet_header_label}>
        {isColumn ? convertNumberToLetter(index) : index + 1}
      </span>
      <button className={styles.sheet_header_control} onClick={onDelete}>
        <CrossIcon />
      </button>
    </div>
  );
}

function Headers({
  type,
  headers,
  deleteHeader,
  moveHeader,
  className,
  ...props
}: HeadersProps) {
  const items = useMemo(() => headers.map((header) => header.id), [headers]);
  const isColumn = useMemo(() => type === "column", [type]);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) {
        return;
      }

      moveHeader(
        getIndexWithId(headers, active.id),
        getIndexWithId(headers, over.id)
      );
    },
    [headers, moveHeader]
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        strategy={
          isColumn ? horizontalListSortingStrategy : verticalListSortingStrategy
        }
        items={items}
      >
        <div className={cx(className, styles.sheet_headers)} {...props}>
          {headers.map((header, index) => (
            <Header
              type={type}
              key={index}
              index={index}
              header={header}
              onDelete={() => deleteHeader(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

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
    moveRow,
    insertColumn,
    insertRow,
    getExpression,
    setCellValue,
  } = spreadsheet;

  return (
    <div className={styles.container}>
      <div
        className={styles.sheet}
        style={
          {
            "--column-header-width": appendUnit(COLUMN_HEADER_WIDTH),
            "--column-initial-width": appendUnit(COLUMN_INITIAL_WIDTH),
            "--row-initial-height": appendUnit(ROW_INITIAL_HEIGHT),
          } as CSSProperties
        }
      >
        <Headers
          type="column"
          className={styles.sheet_headers_columns}
          headers={columns}
          moveHeader={moveColumn}
          deleteHeader={deleteColumn}
        />
        <Headers
          type="row"
          className={styles.sheet_headers_rows}
          headers={rows}
          moveHeader={moveRow}
          deleteHeader={deleteRow}
        />
        <table className={styles.sheet_table}>
          <thead className={styles.sr}>
            <th />
            {columns.map((_, x) => (
              <th key={x}>{convertNumberToLetter(x)}</th>
            ))}
          </thead>
          <tbody>
            {rows.map((row, y) => {
              return (
                <tr key={y}>
                  <th className={styles.sr}>{y}</th>
                  {columns.map((column, x) => {
                    return (
                      <Cell
                        key={column.id + row.id}
                        className={styles.sheet_cell}
                        onClick={() =>
                          selectCell({ columnId: column.id, rowId: row.id })
                        }
                        onValueChange={(value) =>
                          setCellValue(column.id, row.id, value)
                        }
                        getExpression={() => getExpression(column.id, row.id)}
                        displayValue={cells[column.id + row.id]}
                        width={column.width}
                        height={row.height}
                        selectionColor={selectionMap[column.id + row.id]}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        className={cx(styles.add_button, styles.add_button_row)}
        aria-label="Add row"
        onClick={() => insertRow(rows.length, ROW_INITIAL_HEIGHT)}
      >
        <PlusIcon />
      </button>
      <button
        className={cx(styles.add_button, styles.add_button_column)}
        aria-label="Add column"
        onClick={() => insertColumn(columns.length, COLUMN_INITIAL_WIDTH)}
      >
        <PlusIcon />
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

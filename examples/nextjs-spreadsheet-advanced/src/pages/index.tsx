import cx from "classnames";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { useRouter } from "next/router";
import { ComponentProps, CSSProperties, useCallback, useMemo } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToParentElement,
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
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

interface SortableColumnsProps extends ComponentProps<"thead"> {
  columns: Column[];
  deleteColumn: (index: number) => void;
  moveColumn: (from: number, to: number) => void;
}

interface SortableRowsProps extends ComponentProps<"tbody"> {
  rows: Row[];
  deleteRow: (index: number) => void;
  moveRow: (from: number, to: number) => void;
}

interface SortableColumnProps extends ComponentProps<"th"> {
  column: Column;
  index: number;
  onDelete: () => void;
}

interface SortableRowProps extends ComponentProps<"tr"> {
  row: Row;
  index: number;
  onDelete: () => void;
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

function SortableColumn({
  column,
  index,
  onDelete,
  style,
  ...props
}: SortableColumnProps) {
  const { listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({
      id: column.id,
    });

  return (
    <th
      key={column.id}
      ref={setNodeRef}
      scope="col"
      className={styles.sheet_header_cell}
      style={{
        width: appendUnit(column.width),
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        zIndex: isDragging ? 100 : undefined,
      }}
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
        {convertNumberToLetter(index)}
      </span>
      <button className={styles.sheet_header_control} onClick={onDelete}>
        <CrossIcon />
      </button>
    </th>
  );
}

function SortableColumns({
  columns,
  deleteColumn,
  moveColumn,
  className,
  style,
  ...props
}: SortableColumnsProps) {
  const items = useMemo(() => columns.map((column) => column.id), [columns]);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) {
        return;
      }

      moveColumn(
        columns.findIndex((column) => column.id === active.id),
        columns.findIndex((column) => column.id === over.id)
      );
    },
    [columns]
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext strategy={rectSortingStrategy} items={items}>
        <thead
          className={cx(className, styles.sheet_header_row)}
          style={{
            ...style,
            height: appendUnit(ROW_INITIAL_HEIGHT),
          }}
          {...props}
        >
          <tr>
            {columns.map((column, x) => (
              <SortableColumn
                key={x}
                index={x}
                column={column}
                onDelete={() => deleteColumn(x)}
              />
            ))}
          </tr>
        </thead>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  row,
  index,
  onDelete,
  style,
  ...props
}: SortableRowProps) {
  const { listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({
      id: row.id,
    });

  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        zIndex: isDragging ? 100 : undefined,
      }}
      {...props}
    >
      <th
        scope="row"
        className={styles.sheet_header_cell}
        style={{
          width: appendUnit(COLUMN_HEADER_WIDTH),
          height: appendUnit(row.height),
        }}
      >
        <button
          className={styles.sheet_header_control}
          ref={setActivatorNodeRef}
          {...listeners}
        >
          <HandlerIcon />
        </button>
        <span className={styles.sheet_header_label}>{index}</span>
        <button className={styles.sheet_header_control} onClick={onDelete}>
          <CrossIcon />
        </button>
      </th>
    </tr>
  );
}

function SortableRows({
  rows,
  deleteRow,
  moveRow,
  className,
  ...props
}: SortableRowsProps) {
  const items = useMemo(() => rows.map((row) => row.id), [rows]);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) {
        return;
      }

      moveRow(
        rows.findIndex((row) => row.id === active.id),
        rows.findIndex((row) => row.id === over.id)
      );
    },
    [rows]
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext strategy={verticalListSortingStrategy} items={items}>
        <tbody className={cx(className, styles.sheet_header_column)} {...props}>
          {rows.map((row, y) => (
            <SortableRow
              key={y}
              index={y}
              row={row}
              onDelete={() => deleteRow(y)}
            />
          ))}
        </tbody>
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
    <div className={styles.component}>
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
            <SortableColumns
              columns={columns}
              deleteColumn={deleteColumn}
              moveColumn={moveColumn}
            />
            <SortableRows rows={rows} deleteRow={deleteRow} moveRow={moveRow} />
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
                            getExpression={() =>
                              getExpression(column.id, row.id)
                            }
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
      <button
        className={cx(styles.component_button, styles.component_button_row)}
        aria-label="Add row"
        onClick={() => insertRow(rows.length, ROW_INITIAL_HEIGHT)}
      >
        <PlusIcon />
      </button>
      <button
        className={cx(styles.component_button, styles.component_button_column)}
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

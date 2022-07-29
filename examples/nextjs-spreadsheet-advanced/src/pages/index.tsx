import cx from "classnames";
import { useRouter } from "next/router";
import {
  ComponentProps,
  CSSProperties,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { Resizable, ResizeCallback } from "re-resizable";
import { RoomProvider, useHistory } from "../liveblocks.config";
import { Cell } from "../components/Cell";
import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
} from "../components/ContextMenu";
import { useSpreadsheet } from "../spreadsheet/react";
import { convertNumberToLetter } from "../spreadsheet/interpreter/utils";
import { appendUnit, getIndexWithId } from "../utils";
import {
  HandlerIcon,
  CrossIcon,
  AddColumnAfterIcon,
  AddRowAfterIcon,
  UndoIcon,
  RedoIcon,
  AddColumnBeforeIcon,
  AddRowBeforeIcon,
  MoveColumnAfterIcon,
  MoveColumnBeforeIcon,
  MoveRowAfterIcon,
  MoveRowBeforeIcon,
  TrashIcon,
  EraserIcon,
  ResetIcon,
} from "../icons";
import { Row, Column } from "../types";
import styles from "./index.module.css";
import Avatar from "../components/Avatar";
import { createInitialStorage } from "../spreadsheet/utils";
import Tooltip from "../components/Tooltip";
import { TooltipProvider } from "@radix-ui/react-tooltip";

const GRID_INITIAL_ROWS = 4 as const;
const GRID_INITIAL_COLUMNS = 3 as const;
const COLUMN_HEADER_WIDTH = 80;
const COLUMN_INITIAL_WIDTH = 120;
const COLUMN_MIN_WIDTH = 80;
const COLUMN_MAX_WIDTH = 300;
const ROW_INITIAL_HEIGHT = 32;
const ROW_MAX_HEIGHT = 100;

interface HeaderProps extends ComponentProps<"div"> {
  type: "row" | "column";
  header: Row | Column;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onMove: (offset: number) => void;
  onInsert: (offset: number) => void;
  onResize: (width: number, height: number) => void;
}

interface HeadersProps extends ComponentProps<"div"> {
  type: "row" | "column";
  headers: (Row | Column)[];
  deleteHeader: (index: number) => void;
  moveHeader: (from: number, to: number) => void;
  resizeHeader: (index: number, size: number) => void;
  insertHeader: (index: number, width: number) => void;
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
  isFirst,
  isLast,
  onDelete,
  onResize,
  onMove,
  onInsert,
  style,
  ...props
}: HeaderProps) {
  const history = useHistory();
  const { listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({
      id: header.id,
    });
  const initialHeader = useRef(header);
  const isColumn = isColumnHeader(header);

  const handleResizeStart = useCallback(() => {
    history.pause();
    initialHeader.current = header;
  }, [header]);

  const handleResize: ResizeCallback = useCallback(
    (_, __, ___, size) => {
      onResize(
        isColumn ? (initialHeader.current as Column).width + size.width : 0,
        !isColumn ? (initialHeader.current as Row).height + size.height : 0
      );
    },
    [isColumn, onResize]
  );

  const handleResizeStop = useCallback(() => {
    history.resume();
  }, []);

  const handleResizeDefault = useCallback(() => {
    onResize(COLUMN_INITIAL_WIDTH, ROW_INITIAL_HEIGHT);
  }, []);

  return (
    <div
      key={header.id}
      ref={setNodeRef}
      className={styles.sheet_header_container}
      style={
        {
          transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
          zIndex: isDragging ? 100 : undefined,
        } as CSSProperties
      }
      {...props}
    >
      <Resizable
        size={{
          width: isColumn ? header.width : COLUMN_HEADER_WIDTH,
          height: isColumn ? ROW_INITIAL_HEIGHT : header.height,
        }}
        minWidth={COLUMN_MIN_WIDTH}
        maxWidth={COLUMN_MAX_WIDTH}
        minHeight={ROW_INITIAL_HEIGHT}
        maxHeight={ROW_MAX_HEIGHT}
        enable={{ right: isColumn, bottom: !isColumn }}
        handleWrapperClass={styles.sheet_header_handles}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
      >
        <ContextMenu
          asChild
          content={
            <>
              <ContextMenuGroup>
                <ContextMenuItem
                  icon={
                    isColumn ? <AddColumnBeforeIcon /> : <AddRowBeforeIcon />
                  }
                  label={`Add ${isColumn ? "Column Before" : "Row Above"}`}
                  onSelect={() => onInsert(0)}
                />
                <ContextMenuItem
                  icon={isColumn ? <AddColumnAfterIcon /> : <AddRowAfterIcon />}
                  label={`Add ${isColumn ? "Column After" : "Row Below"}`}
                  onSelect={() => onInsert(1)}
                />
              </ContextMenuGroup>
              <ContextMenuGroup>
                <ContextMenuItem
                  icon={
                    isColumn ? <MoveColumnBeforeIcon /> : <MoveRowBeforeIcon />
                  }
                  label={`Move ${isColumn ? "Column Before" : "Row Above"}`}
                  onSelect={() => onMove(-1)}
                  disabled={isFirst}
                />
                <ContextMenuItem
                  icon={
                    isColumn ? <MoveColumnAfterIcon /> : <MoveRowAfterIcon />
                  }
                  label={`Move ${isColumn ? "Column After" : "Row Below"}`}
                  onSelect={() => onMove(1)}
                  disabled={isLast}
                />
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuGroup>
                <ContextMenuItem
                  icon={<ResetIcon />}
                  label="Resize to Default"
                  onSelect={handleResizeDefault}
                />
                <ContextMenuItem
                  icon={<EraserIcon />}
                  label={`Clear ${isColumn ? "Column" : "Row"} (TODO)`}
                />
                <ContextMenuItem
                  icon={<TrashIcon />}
                  label={`Delete ${isColumn ? "Column" : "Row"}`}
                  onSelect={onDelete}
                />
              </ContextMenuGroup>
            </>
          }
        >
          <div className={styles.sheet_header}>
            <Tooltip content="Drag to Reorder">
              <button
                className={cx(
                  styles.sheet_header_control,
                  styles.sheet_header_handler
                )}
                ref={setActivatorNodeRef}
                {...listeners}
              >
                <HandlerIcon />
              </button>
            </Tooltip>
            <span className={styles.sheet_header_label}>
              {isColumn ? convertNumberToLetter(index) : index + 1}
            </span>
            <Tooltip content={`Delete ${isColumn ? "Column" : "Row"}`}>
              <button
                className={styles.sheet_header_control}
                onClick={onDelete}
              >
                <CrossIcon />
              </button>
            </Tooltip>
          </div>
        </ContextMenu>
      </Resizable>
    </div>
  );
}

function Headers({
  type,
  headers,
  deleteHeader,
  moveHeader,
  resizeHeader,
  insertHeader,
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
              isFirst={index === 0}
              isLast={index === headers.length - 1}
              onDelete={() => deleteHeader(index)}
              onResize={(width, height) =>
                resizeHeader(index, isColumn ? width : height)
              }
              onMove={(offset: number) => moveHeader(index, index + offset)}
              onInsert={(offset: number) =>
                insertHeader(
                  index + offset,
                  isColumn ? COLUMN_INITIAL_WIDTH : ROW_INITIAL_HEIGHT
                )
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

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

  const {
    users,
    selections,
    columns,
    rows,
    cells,
    selectCell,
    deleteColumn,
    deleteRow,
    moveColumn,
    moveRow,
    insertColumn,
    insertRow,
    resizeColumn,
    resizeRow,
    getExpression,
    setCellValue,
  } = spreadsheet;

  return (
    <div
      className={styles.container}
      style={
        {
          "--column-header-width": appendUnit(COLUMN_HEADER_WIDTH),
          "--column-width": appendUnit(COLUMN_INITIAL_WIDTH),
          "--row-height": appendUnit(ROW_INITIAL_HEIGHT),
        } as CSSProperties
      }
    >
      <div className={styles.header}>
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
      <div className={styles.sheet}>
        <Headers
          type="column"
          className={styles.sheet_headers_column}
          headers={columns}
          moveHeader={moveColumn}
          deleteHeader={deleteColumn}
          resizeHeader={resizeColumn}
          insertHeader={insertColumn}
        />
        <Headers
          type="row"
          className={styles.sheet_headers_row}
          headers={rows}
          moveHeader={moveRow}
          deleteHeader={deleteRow}
          resizeHeader={resizeRow}
          insertHeader={insertRow}
        />
        <table className={styles.sheet_table}>
          <thead className={styles.sr}>
            <tr>
              <th />
              {columns.map((_, x) => (
                <th key={x}>{convertNumberToLetter(x)}</th>
              ))}
            </tr>
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
                        selection={selections[column.id + row.id]}
                      />
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

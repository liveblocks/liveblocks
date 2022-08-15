import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  rectIntersection,
  DragOverlay,
  type UniqueIdentifier,
  type MeasuringConfiguration,
  MeasuringStrategy,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DropAnimation,
  type DndContextProps,
  type DragOverEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useGesture } from "@use-gesture/react";
import cx from "classnames";
import {
  type CSSProperties,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  COLUMN_HEADER_WIDTH,
  COLUMN_INITIAL_WIDTH,
  COLUMN_MAX_WIDTH,
  COLUMN_MIN_WIDTH,
  ROW_INITIAL_HEIGHT,
  ROW_MAX_HEIGHT,
} from "../constants";
import {
  AddColumnAfterIcon,
  AddColumnBeforeIcon,
  AddRowAfterIcon,
  AddRowBeforeIcon,
  EllipsisIcon,
  EraserIcon,
  HandlerIcon,
  MoveColumnAfterIcon,
  MoveColumnBeforeIcon,
  MoveRowAfterIcon,
  MoveRowBeforeIcon,
  ResetIcon,
  TrashIcon,
} from "../icons";
import { useHistory, useSelf } from "../liveblocks.config";
import { getHeaderLabel } from "../spreadsheet/interpreter/utils";
import type { Cell, Column, Row } from "../types";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";
import { removeGlobalCursor, setGlobalCursor } from "../utils/globalCursor";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./DropdownMenu";
import { clamp } from "../utils/clamp";
import { getCellId } from "../spreadsheet/utils";
import { appendUnit } from "../utils/appendUnit";
import { DisplayCell } from "./Cell";
import styles from "./Headers.module.css";

const DRAGGING_CLASS = "dragging";

export interface Props extends ComponentProps<"div"> {
  clearHeader: (index: number) => void;
  deleteHeader: (index: number) => void;
  cells: Record<string, string>;
  columns: Column[];
  rows: Row[];
  insertHeader: (index: number, width: number) => void;
  moveHeader: (from: number, to: number) => void;
  resizeHeader: (index: number, size: number) => void;
  onSortOver: (index?: number, position?: "before" | "after") => void;
  selectedHeader?: string;
  type: "column" | "row";
  max: number;
}

export interface HeaderProps extends ComponentProps<"div"> {
  header: Column | Row;
  index: number;
  activeIndex: number | null;
  isSelected: boolean;
  canMoveBefore: () => boolean;
  canMoveAfter: () => boolean;
  canInsert: () => boolean;
  canDelete: () => boolean;
  onClear: () => void;
  onDelete: () => void;
  onInsert: (offset: number) => void;
  onMove: (offset: number) => void;
  onResize: (width: number, height: number) => void;
}

export interface HeaderDragOverlayProps extends ComponentProps<"div"> {
  index: number;
  header: Column | Row;
  cells: Record<string, string>;
  columns: Column[];
  rows: Row[];
}

interface ColumnCell extends Cell {
  height: number;
}

interface RowCell extends Cell {
  width: number;
}

function isColumnHeader(header: Column | Row): header is Column {
  return Boolean((header as Column).width);
}

const measuring: MeasuringConfiguration = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

const dropAnimation: DropAnimation = {
  duration: 260,
  easing: "ease-in-out",
  keyframes({ transform }) {
    return [
      { transform: CSS.Transform.toString(transform.initial) },
      {
        transform: CSS.Transform.toString(transform.final),
        opacity: 0,
      },
    ];
  },
};

function HeaderDragOverlay({
  index,
  header,
  cells: allCells,
  columns,
  rows,
  className,
  style,
  ...props
}: HeaderDragOverlayProps) {
  const isColumn = isColumnHeader(header);

  const cells = useMemo(() => {
    if (isColumn) {
      return rows.map((row) => {
        const cell = allCells[getCellId(header.id, row.id)];

        return {
          height: row.height,
          value: cell,
        } as ColumnCell;
      });
    } else {
      return columns.map((column) => {
        const cell = allCells[getCellId(column.id, header.id)];

        return {
          width: column.width,
          value: cell,
        } as RowCell;
      });
    }
  }, [header, allCells, columns, rows]);

  return (
    <div
      className={cx(className, styles.overlay, isColumn ? "column" : "row")}
      style={{
        width: isColumn ? header.width : COLUMN_HEADER_WIDTH,
        height: !isColumn ? header.height : ROW_INITIAL_HEIGHT,
        ...style,
      }}
      {...props}
    >
      <div className={styles.overlay_header}>
        <div
          className={cx(
            styles.header_control,
            styles.header_control_active,
            styles.header_handler
          )}
        >
          <HandlerIcon />
        </div>
        <span className={styles.header_label}>
          {getHeaderLabel(index, isColumn ? "column" : "row")}
        </span>
        <div className={styles.header_control} />
      </div>
      <div className={styles.overlay_cells}>
        {cells.map((cell, index) => (
          <div
            key={index}
            className={styles.overlay_cell}
            style={
              {
                "--cell-width": appendUnit(
                  isColumn ? header.width : (cell as RowCell).width
                ),
                "--cell-height": appendUnit(
                  !isColumn ? header.height : (cell as ColumnCell).height
                ),
              } as CSSProperties
            }
          >
            <DisplayCell value={cell.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Header({
  index,
  activeIndex,
  header,
  isSelected,
  canMoveBefore,
  canMoveAfter,
  canInsert,
  canDelete,
  onDelete,
  onClear,
  onResize,
  onMove,
  onInsert,
  ...props
}: HeaderProps) {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const self = useSelf();
  const history = useHistory();
  const { listeners, setNodeRef, setActivatorNodeRef, isDragging, isOver } =
    useSortable({
      id: header.id,
    });
  const initialHeader = useRef(header);
  const isColumn = isColumnHeader(header);

  const handleDropdownOpenChange = useCallback((open: boolean) => {
    setDropdownOpen(open);
  }, []);

  const handleResizeDefault = useCallback(() => {
    onResize(COLUMN_INITIAL_WIDTH, ROW_INITIAL_HEIGHT);
  }, [onResize]);

  const bindResizeEvents = useGesture(
    {
      onDragStart: () => {
        initialHeader.current = header;
        history.pause();
        setGlobalCursor(isColumn ? "resizing-column" : "resizing-row");
      },
      onDrag: ({ movement: [x, y] }) => {
        onResize(
          isColumn
            ? clamp(
                (initialHeader.current as Column).width + x,
                COLUMN_MIN_WIDTH,
                COLUMN_MAX_WIDTH
              )
            : 0,
          !isColumn
            ? clamp(
                (initialHeader.current as Row).height + y,
                ROW_INITIAL_HEIGHT,
                ROW_MAX_HEIGHT
              )
            : 0
        );
      },
      onDragEnd: () => {
        history.resume();
        removeGlobalCursor(isColumn ? "resizing-column" : "resizing-row");
      },
    },
    {
      drag: {
        axis: isColumn ? "x" : "y",
      },
    }
  );

  useEffect(() => {
    const changeGlobalCursor = isDragging
      ? setGlobalCursor
      : removeGlobalCursor;

    changeGlobalCursor("grabbing");
  }, [isDragging]);

  return (
    <div
      className={styles.header_draggable_container}
      key={header.id}
      ref={setNodeRef}
      {...props}
    >
      <div
        className={styles.header_resizable_container}
        style={{
          width: isColumn ? header.width : "100%",
          minWidth: isColumn ? COLUMN_MIN_WIDTH : undefined,
          maxWidth: isColumn ? COLUMN_MAX_WIDTH : undefined,
          height: !isColumn ? header.height : "100%",
          minHeight: !isColumn ? ROW_INITIAL_HEIGHT : undefined,
          maxHeight: !isColumn ? ROW_MAX_HEIGHT : undefined,
        }}
      >
        <div
          {...bindResizeEvents()}
          className={styles.header_resizable_handle}
        />
        <div
          className={cx(styles.header_container, {
            selected: isSelected,
            "menu-opened": isDropdownOpen,
            over: isOver,
          })}
        >
          <div className={styles.header}>
            <button
              className={cx(styles.header_control, styles.header_handler)}
              ref={setActivatorNodeRef}
              {...listeners}
            >
              <HandlerIcon />
            </button>
            <span className={styles.header_label}>
              {getHeaderLabel(index, isColumn ? "column" : "row")}
            </span>
            <DropdownMenu
              align="start"
              style={{ "--accent": self?.info.color } as CSSProperties}
              content={
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={!canInsert()}
                      icon={
                        isColumn ? (
                          <AddColumnBeforeIcon />
                        ) : (
                          <AddRowBeforeIcon />
                        )
                      }
                      label={`Add ${isColumn ? "Column Before" : "Row Above"}`}
                      onSelect={() => onInsert(0)}
                    />
                    <DropdownMenuItem
                      disabled={!canInsert()}
                      icon={
                        isColumn ? <AddColumnAfterIcon /> : <AddRowAfterIcon />
                      }
                      label={`Add ${isColumn ? "Column After" : "Row Below"}`}
                      onSelect={() => onInsert(1)}
                    />
                  </DropdownMenuGroup>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={!canMoveBefore()}
                      icon={
                        isColumn ? (
                          <MoveColumnBeforeIcon />
                        ) : (
                          <MoveRowBeforeIcon />
                        )
                      }
                      label={`Move ${isColumn ? "Column Before" : "Row Above"}`}
                      onSelect={() => onMove(-1)}
                    />
                    <DropdownMenuItem
                      disabled={!canMoveAfter()}
                      icon={
                        isColumn ? (
                          <MoveColumnAfterIcon />
                        ) : (
                          <MoveRowAfterIcon />
                        )
                      }
                      label={`Move ${isColumn ? "Column After" : "Row Below"}`}
                      onSelect={() => onMove(1)}
                    />
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      icon={<ResetIcon />}
                      label={`Reset ${isColumn ? "Width" : "Height"}`}
                      onSelect={handleResizeDefault}
                    />
                    <DropdownMenuItem
                      icon={<EraserIcon />}
                      label={`Clear ${isColumn ? "Column" : "Row"}`}
                      onSelect={onClear}
                    />
                    <DropdownMenuItem
                      disabled={!canDelete()}
                      icon={<TrashIcon />}
                      label={`Delete ${isColumn ? "Column" : "Row"}`}
                      onSelect={onDelete}
                    />
                  </DropdownMenuGroup>
                </>
              }
              onOpenChange={handleDropdownOpenChange}
              open={isDropdownOpen}
              side="bottom"
            >
              <button className={cx(styles.header_control, styles.header_menu)}>
                <EllipsisIcon />
              </button>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Headers({
  type,
  max,
  cells,
  columns,
  rows,
  selectedHeader,
  deleteHeader,
  clearHeader,
  moveHeader,
  resizeHeader,
  insertHeader,
  onSortOver,
  className,
  ...props
}: Props) {
  const self = useSelf();
  const isColumn = useMemo(() => type === "column", [type]);
  const headers = useMemo(
    () => (isColumn ? columns : rows),
    [columns, rows, type]
  );
  const headersIds = useMemo(
    () => headers.map((header) => header.id),
    [headers]
  );
  const [activeHeadersId, setActiveHeadersId] =
    useState<UniqueIdentifier | null>(null);
  const activeIndex = useMemo(
    () =>
      activeHeadersId
        ? getIndexWithProperty<Column | Row, "id">(
            headers,
            "id",
            String(activeHeadersId)
          )
        : null,
    [activeHeadersId]
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const accessibility: DndContextProps["accessibility"] = useMemo(
    () => ({
      screenReaderInstructions: {
        draggable: `To pick up a ${
          isColumn ? "column" : "row"
        }, press space or enter. 
While dragging, use the arrow keys to move the ${isColumn ? "column" : "row"} ${
          isColumn ? "before" : "above"
        } or ${isColumn ? "after" : "below"}.
Press space or enter again to drop the ${
          isColumn ? "column" : "row"
        } in its new position, or press escape to cancel.`,
      },
      announcements: {
        onDragStart: ({ active }) => {
          const index = getIndexWithProperty<Column | Row, "id">(
            headers,
            "id",
            String(active.id)
          );

          return `Picked up ${isColumn ? "column" : "row"} ${getHeaderLabel(
            index,
            isColumn ? "column" : "row"
          )}.`;
        },
        onDragOver: ({ active, over }) => {
          const index = getIndexWithProperty<Column | Row, "id">(
            headers,
            "id",
            String(active.id)
          );

          if (over) {
            const overIndex = getIndexWithProperty<Column | Row, "id">(
              headers,
              "id",
              String(over.id)
            );

            return `${isColumn ? "Column" : "Row"} ${getHeaderLabel(
              index,
              isColumn ? "column" : "row"
            )} was moved over ${isColumn ? "column" : "row"} ${getHeaderLabel(
              overIndex,
              isColumn ? "column" : "row"
            )}.`;
          } else {
            return `${isColumn ? "Column" : "Row"} ${getHeaderLabel(
              index,
              isColumn ? "column" : "row"
            )} is no longer over a ${isColumn ? "column" : "row"}.`;
          }
        },
        onDragEnd: ({ active, over }) => {
          const index = getIndexWithProperty<Column | Row, "id">(
            headers,
            "id",
            String(active.id)
          );

          if (over) {
            const overIndex = getIndexWithProperty<Column | Row, "id">(
              headers,
              "id",
              String(over.id)
            );

            return `${isColumn ? "Column" : "Row"} ${getHeaderLabel(
              index,
              isColumn ? "column" : "row"
            )} was dropped over ${isColumn ? "column" : "row"} ${getHeaderLabel(
              overIndex,
              isColumn ? "column" : "row"
            )}`;
          } else {
            return `${isColumn ? "Column" : "Row"} ${getHeaderLabel(
              index,
              isColumn ? "column" : "row"
            )} was dropped.`;
          }
        },
        onDragCancel: ({ active }) => {
          const index = getIndexWithProperty<Column | Row, "id">(
            headers,
            "id",
            String(active.id)
          );

          return `Dragging was cancelled. ${
            isColumn ? "Column" : "Row"
          } ${getHeaderLabel(index, isColumn ? "column" : "row")} was dropped.`;
        },
      },
    }),
    [isColumn]
  );

  const handleDragStop = useCallback(() => {
    document.body.classList.remove(DRAGGING_CLASS);
    setActiveHeadersId(null);
    onSortOver();
  }, []);

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    document.body.classList.add(DRAGGING_CLASS);
    setActiveHeadersId(active.id);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) {
        return;
      }

      handleDragStop();
      moveHeader(
        getIndexWithProperty<Column | Row, "id">(
          headers,
          "id",
          String(active.id)
        ),
        getIndexWithProperty<Column | Row, "id">(headers, "id", String(over.id))
      );
    },
    [headers, moveHeader, handleDragStop]
  );

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over) return;

      const overIndex = getIndexWithProperty<Column | Row, "id">(
        headers,
        "id",
        String(over.id)
      );

      onSortOver(
        overIndex,
        over.id !== active.id
          ? overIndex > (activeIndex ?? -1)
            ? "after"
            : "before"
          : undefined
      );
    },
    [headers, activeIndex]
  );

  return (
    <DndContext
      collisionDetection={rectIntersection}
      modifiers={[
        restrictToParentElement,
        isColumn ? restrictToHorizontalAxis : restrictToVerticalAxis,
      ]}
      sensors={sensors}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragStop}
      accessibility={accessibility}
      onDragOver={handleDragOver}
    >
      <SortableContext
        items={headersIds}
        strategy={
          isColumn ? horizontalListSortingStrategy : verticalListSortingStrategy
        }
      >
        <div
          aria-hidden
          className={cx(className, styles.headers, type)}
          {...props}
        >
          {headers.map((header, index) => (
            <Header
              header={header}
              index={index}
              activeIndex={activeIndex}
              canMoveBefore={() => index > 0}
              canMoveAfter={() => index < headers.length - 1}
              canInsert={() => headers.length < max}
              canDelete={() => headers.length > 1}
              isSelected={selectedHeader === header.id}
              key={index}
              onClear={() => clearHeader(index)}
              onDelete={() => deleteHeader(index)}
              onInsert={(offset: number) =>
                insertHeader(
                  index + offset,
                  isColumn ? COLUMN_INITIAL_WIDTH : ROW_INITIAL_HEIGHT
                )
              }
              onMove={(offset: number) => moveHeader(index, index + offset)}
              onResize={(width, height) =>
                resizeHeader(index, isColumn ? width : height)
              }
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeIndex != null ? (
          <HeaderDragOverlay
            columns={columns}
            rows={rows}
            cells={cells}
            header={headers[activeIndex]}
            index={activeIndex}
            style={{ "--accent": self?.info.color } as CSSProperties}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

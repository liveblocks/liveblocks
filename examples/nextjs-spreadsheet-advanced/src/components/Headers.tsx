import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
  DragOverlay,
  type UniqueIdentifier,
  type MeasuringConfiguration,
  MeasuringStrategy,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import cx from "classnames";
import { Resizable, type ResizeCallback } from "re-resizable";
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
import { useHistory } from "../liveblocks.config";
import { convertNumberToLetter } from "../spreadsheet/interpreter/utils";
import type { Cell, Column, Row } from "../types";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";
import { removeGlobalCursor, setGlobalCursor } from "../utils/globalCursor";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./DropdownMenu";
import { getCellId } from "../spreadsheet/utils";
import { appendUnit } from "../utils/appendUnit";
import styles from "./Headers.module.css";
import cellStyles from "./Cell.module.css";

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
          {isColumn ? convertNumberToLetter(index) : index + 1}
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
            <div
              className={cx(cellStyles.display, styles.overlay_cell_content)}
            >
              {cell.value ?? null}
            </div>
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
  const history = useHistory();
  const { listeners, setNodeRef, setActivatorNodeRef, over, isDragging } =
    useSortable({
      id: header.id,
    });
  const initialHeader = useRef(header);
  const isColumn = isColumnHeader(header);
  const dropPosition = useMemo(
    () => (over?.id === header.id ? (index > (activeIndex ?? -1) ? 1 : -1) : 0),
    [over, header, index, activeIndex]
  );

  const handleDropdownOpenChange = useCallback((open: boolean) => {
    setDropdownOpen(open);
  }, []);

  const handleResizeStart = useCallback(() => {
    initialHeader.current = header;
    history.pause();
    setGlobalCursor(isColumn ? "resizing-column" : "resizing-row");
  }, [header, history, isColumn]);

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
    removeGlobalCursor(isColumn ? "resizing-column" : "resizing-row");
  }, [history, isColumn]);

  const handleResizeDefault = useCallback(() => {
    onResize(COLUMN_INITIAL_WIDTH, ROW_INITIAL_HEIGHT);
  }, [onResize]);

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
      <Resizable
        className={styles.header_resizable_container}
        enable={{ right: isColumn, bottom: !isColumn }}
        handleWrapperClass={styles.header_handles}
        maxHeight={ROW_MAX_HEIGHT}
        maxWidth={COLUMN_MAX_WIDTH}
        minHeight={ROW_INITIAL_HEIGHT}
        minWidth={COLUMN_MIN_WIDTH}
        onResize={handleResize}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
        size={{
          width: isColumn ? header.width : COLUMN_HEADER_WIDTH,
          height: isColumn ? ROW_INITIAL_HEIGHT : header.height,
        }}
      >
        <div
          className={cx(styles.header, {
            selected: isSelected,
            "menu-opened": isDropdownOpen,
            drop: dropPosition !== 0,
            "drop-before": dropPosition < 0,
            "drop-after": dropPosition > 0,
          })}
        >
          <button
            className={cx(styles.header_control, styles.header_handler)}
            ref={setActivatorNodeRef}
            {...listeners}
          >
            <HandlerIcon />
          </button>
          <span className={styles.header_label}>
            {isColumn ? convertNumberToLetter(index) : index + 1}
          </span>
          <DropdownMenu
            align="start"
            content={
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={!canInsert()}
                    icon={
                      isColumn ? <AddColumnBeforeIcon /> : <AddRowBeforeIcon />
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
                      isColumn ? <MoveColumnAfterIcon /> : <MoveRowAfterIcon />
                    }
                    label={`Move ${isColumn ? "Column After" : "Row Below"}`}
                    onSelect={() => onMove(1)}
                  />
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    icon={<ResetIcon />}
                    label="Resize to Default"
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
      </Resizable>
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
  className,
  ...props
}: Props) {
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

  const handleDragStop = useCallback(() => {
    document.body.classList.remove(DRAGGING_CLASS);
    setActiveHeadersId(null);
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

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      sensors={sensors}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragStop}
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
      <DragOverlay dropAnimation={null}>
        {activeIndex != null ? (
          <HeaderDragOverlay
            columns={columns}
            rows={rows}
            cells={cells}
            header={headers[activeIndex]}
            index={activeIndex}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

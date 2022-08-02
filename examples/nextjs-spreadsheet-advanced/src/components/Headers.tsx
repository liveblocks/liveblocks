import cx from "classnames";
import { DragEndEvent, DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  useSortable,
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ResizeCallback, Resizable } from "re-resizable";
import {
  ComponentProps,
  useState,
  useRef,
  useCallback,
  useEffect,
  CSSProperties,
  useMemo,
} from "react";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./DropdownMenu";
import {
  COLUMN_INITIAL_WIDTH,
  ROW_INITIAL_HEIGHT,
  COLUMN_HEADER_WIDTH,
  COLUMN_MIN_WIDTH,
  COLUMN_MAX_WIDTH,
  ROW_MAX_HEIGHT,
} from "../constants";
import {
  HandlerIcon,
  AddColumnBeforeIcon,
  AddRowBeforeIcon,
  AddColumnAfterIcon,
  AddRowAfterIcon,
  MoveColumnBeforeIcon,
  MoveRowBeforeIcon,
  MoveColumnAfterIcon,
  MoveRowAfterIcon,
  ResetIcon,
  EraserIcon,
  TrashIcon,
  ChevronIcon,
} from "../icons";
import { useHistory } from "../liveblocks.config";
import { convertNumberToLetter } from "../spreadsheet/interpreter/utils";
import { Row, Column } from "../types";
import { setGlobalCursor, removeGlobalCursor } from "../utils/globalCursor";
import styles from "./Headers.module.css";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";

export interface Props extends ComponentProps<"div"> {
  type: "row" | "column";
  headers: (Row | Column)[];
  deleteHeader: (index: number) => void;
  clearHeader: (index: number) => void;
  moveHeader: (from: number, to: number) => void;
  resizeHeader: (index: number, size: number) => void;
  insertHeader: (index: number, width: number) => void;
}

export interface HeaderProps extends ComponentProps<"div"> {
  type: "row" | "column";
  header: Row | Column;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onClear: () => void;
  onMove: (offset: number) => void;
  onInsert: (offset: number) => void;
  onResize: (width: number, height: number) => void;
}

function isRowHeader(header: Row | Column): header is Row {
  return Boolean((header as Row).height);
}

function isColumnHeader(header: Row | Column): header is Column {
  return Boolean((header as Column).width);
}

export function Header({
  type,
  index,
  header,
  isFirst,
  isLast,
  onDelete,
  onClear,
  onResize,
  onMove,
  onInsert,
  style,
  ...props
}: HeaderProps) {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const history = useHistory();
  const { listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({
      id: header.id,
    });
  const initialHeader = useRef(header);
  const isColumn = isColumnHeader(header);

  const handleDropdownOpenChange = useCallback((open: boolean) => {
    setDropdownOpen(open);
  }, []);

  const handleResizeStart = useCallback(() => {
    initialHeader.current = header;
    history.pause();
    setGlobalCursor(isColumn ? "resizing-column" : "resizing-row");
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
    removeGlobalCursor(isColumn ? "resizing-column" : "resizing-row");
  }, []);

  const handleResizeDefault = useCallback(() => {
    onResize(COLUMN_INITIAL_WIDTH, ROW_INITIAL_HEIGHT);
  }, []);

  useEffect(() => {
    const changeGlobalCursor = isDragging
      ? setGlobalCursor
      : removeGlobalCursor;

    changeGlobalCursor("grabbing");
  }, [isDragging]);

  return (
    <div
      key={header.id}
      ref={setNodeRef}
      className={styles.header_draggable_container}
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
        handleWrapperClass={styles.header_handles}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        className={styles.header_resizable_container}
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
            {isColumn ? convertNumberToLetter(index) : index + 1}
          </span>
          <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={handleDropdownOpenChange}
            content={
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    icon={
                      isColumn ? <AddColumnBeforeIcon /> : <AddRowBeforeIcon />
                    }
                    label={`Add ${isColumn ? "Column Before" : "Row Above"}`}
                    onSelect={() => onInsert(0)}
                  />
                  <DropdownMenuItem
                    icon={
                      isColumn ? <AddColumnAfterIcon /> : <AddRowAfterIcon />
                    }
                    label={`Add ${isColumn ? "Column After" : "Row Below"}`}
                    onSelect={() => onInsert(1)}
                  />
                </DropdownMenuGroup>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    icon={
                      isColumn ? (
                        <MoveColumnBeforeIcon />
                      ) : (
                        <MoveRowBeforeIcon />
                      )
                    }
                    label={`Move ${isColumn ? "Column Before" : "Row Above"}`}
                    onSelect={() => onMove(-1)}
                    disabled={isFirst}
                  />
                  <DropdownMenuItem
                    icon={
                      isColumn ? <MoveColumnAfterIcon /> : <MoveRowAfterIcon />
                    }
                    label={`Move ${isColumn ? "Column After" : "Row Below"}`}
                    onSelect={() => onMove(1)}
                    disabled={isLast}
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
                    icon={<TrashIcon />}
                    label={`Delete ${isColumn ? "Column" : "Row"}`}
                    onSelect={onDelete}
                  />
                </DropdownMenuGroup>
              </>
            }
          >
            <button className={styles.header_control}>
              <ChevronIcon />
            </button>
          </DropdownMenu>
        </div>
      </Resizable>
    </div>
  );
}

export function Headers({
  type,
  headers,
  deleteHeader,
  clearHeader,
  moveHeader,
  resizeHeader,
  insertHeader,
  className,
  ...props
}: Props) {
  const items = useMemo(() => headers.map((header) => header.id), [headers]);
  const isColumn = useMemo(() => type === "column", [type]);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) {
        return;
      }

      moveHeader(
        getIndexWithProperty(headers, "id", String(active.id)),
        getIndexWithProperty(headers, "id", String(over.id))
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
        <div
          className={cx(className, styles.headers, type)}
          aria-hidden
          {...props}
        >
          {headers.map((header, index) => (
            <Header
              type={type}
              key={index}
              index={index}
              header={header}
              isFirst={index === 0}
              isLast={index === headers.length - 1}
              onDelete={() => deleteHeader(index)}
              onClear={() => clearHeader(index)}
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

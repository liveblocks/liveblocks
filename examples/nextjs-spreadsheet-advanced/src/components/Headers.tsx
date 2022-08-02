import { DndContext, type DragEndEvent, closestCenter } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
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
import type { Column, Row } from "../types";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";
import { removeGlobalCursor, setGlobalCursor } from "../utils/globalCursor";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./DropdownMenu";
import styles from "./Headers.module.css";

export interface Props extends ComponentProps<"div"> {
  clearHeader: (index: number) => void;
  deleteHeader: (index: number) => void;
  headers: (Column | Row)[];
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

function isRowHeader(header: Column | Row): header is Row {
  return Boolean((header as Row).height);
}

function isColumnHeader(header: Column | Row): header is Column {
  return Boolean((header as Column).width);
}

export function Header({
  index,
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
        <div className={cx(styles.header, isSelected && "selected")}>
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
            <button className={styles.header_control}>
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
  headers,
  selectedHeader,
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
        items={items}
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
    </DndContext>
  );
}

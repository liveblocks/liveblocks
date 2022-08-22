import cx from "classnames";
import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { GRID_MAX_COLUMNS, GRID_MAX_ROWS } from "../constants";
import { useHistory } from "../liveblocks.config";
import { getHeaderLabel } from "../spreadsheet/interpreter/utils";
import type { ReactSpreadsheet } from "../spreadsheet/react";
import { getCellId } from "../spreadsheet/utils";
import type { CellAddress, Column, Row } from "../types";
import { TABLE_ID, canUseHotkeys } from "../utils/canUseHotkeys";
import { clamp } from "../utils/clamp";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";
import { Cell } from "./Cell";
import { Headers, type Props as HeadersProps } from "./Headers";
import styles from "./Sheet.module.css";

export type Props = ComponentProps<"div"> & ReactSpreadsheet;

interface SortIndicator {
  index: number;
  position?: "after" | "before";
  type: "column" | "row";
}

export function Sheet({
  cells,
  columns,
  rows,
  moveColumn,
  moveRow,
  clearColumn,
  clearRow,
  deleteColumn,
  deleteRow,
  resizeColumn,
  resizeRow,
  insertColumn,
  insertRow,
  selectCell,
  deleteCell,
  setCellValue,
  getCellExpression,
  selection,
  others,
}: Props) {
  const history = useHistory();
  const [edition, setEdition] = useState<CellAddress | null>(null);
  const [sortIndicator, setSortIndicator] = useState<SortIndicator>();
  const shouldUseHotkeys = useMemo(
    () => Boolean(selection && !edition),
    [selection, edition]
  );
  const hotkeysOptions = useMemo(
    () => ({ enabled: shouldUseHotkeys, filter: canUseHotkeys }),
    [shouldUseHotkeys]
  );

  const moveSelection = useCallback(
    (direction: "down" | "left" | "right" | "up") => {
      return (event: KeyboardEvent) => {
        event.preventDefault();

        const x = getIndexWithProperty(columns, "id", selection!.columnId);
        const y = getIndexWithProperty(rows, "id", selection!.rowId);

        switch (direction) {
          case "up":
            selectCell(
              selection!.columnId,
              rows[clamp(y - 1, 0, rows.length - 1)].id
            );
            break;
          case "down":
            selectCell(
              selection!.columnId,
              rows[clamp(y + 1, 0, rows.length - 1)].id
            );
            break;
          case "left":
            selectCell(
              columns[clamp(x - 1, 0, columns.length - 1)].id,
              selection!.rowId
            );
            break;
          case "right":
            selectCell(
              columns[clamp(x + 1, 0, columns.length - 1)].id,
              selection!.rowId
            );
            break;
        }
      };
    },
    [columns, rows, selectCell, selection]
  );

  useHotkeys("up", moveSelection("up"), hotkeysOptions, [selection]);
  useHotkeys("down", moveSelection("down"), hotkeysOptions, [selection]);
  useHotkeys("left", moveSelection("left"), hotkeysOptions, [selection]);
  useHotkeys("right", moveSelection("right"), hotkeysOptions, [selection]);

  useHotkeys(
    "enter",
    (event) => {
      event.preventDefault();
      setEdition(selection);
    },
    hotkeysOptions,
    [selection]
  );
  useHotkeys(
    "delete, backspace",
    (event) => {
      event.preventDefault();
      deleteCell(selection!.columnId, selection!.rowId);
    },
    hotkeysOptions,
    [selection]
  );

  useHotkeys(
    "cmd+z, ctrl+z",
    (event) => {
      event.preventDefault();
      history.undo();
    },
    hotkeysOptions,
    [history]
  );
  useHotkeys(
    "shift+cmd+z, shift+ctrl+z",
    (event) => {
      event.preventDefault();
      history.redo();
    },
    hotkeysOptions,
    [history]
  );

  const handleColumnSortOver: HeadersProps["onSortOver"] = useCallback(
    (index, position) => {
      if (typeof index === "number") {
        setSortIndicator({ type: "column", index, position });
      } else {
        setSortIndicator(undefined);
      }
    },
    []
  );

  const handleRowSortOver: HeadersProps["onSortOver"] = useCallback(
    (index, position) => {
      if (typeof index === "number") {
        setSortIndicator({ type: "row", index, position });
      } else {
        setSortIndicator(undefined);
      }
    },
    []
  );

  return (
    <div className={styles.sheet}>
      <Headers
        cells={cells}
        className={styles.columns}
        clearHeader={clearColumn}
        columns={columns}
        deleteHeader={deleteColumn}
        insertHeader={insertColumn}
        max={GRID_MAX_COLUMNS}
        moveHeader={moveColumn}
        onSortOver={handleColumnSortOver}
        resizeHeader={resizeColumn}
        rows={rows}
        selectedHeader={selection?.columnId}
        type="column"
      />
      <Headers
        cells={cells}
        className={styles.rows}
        clearHeader={clearRow}
        columns={columns}
        deleteHeader={deleteRow}
        insertHeader={insertRow}
        max={GRID_MAX_ROWS}
        moveHeader={moveRow}
        onSortOver={handleRowSortOver}
        resizeHeader={resizeRow}
        rows={rows}
        selectedHeader={selection?.rowId}
        type="row"
      />
      {sortIndicator && (
        <div
          aria-hidden
          className={cx(styles.sort_indicators, sortIndicator.type)}
        >
          {(sortIndicator.type === "column" ? columns : rows).map(
            (header, index) => (
              <div
                className={styles.sort_indicator_container}
                key={index}
                style={{
                  width: (header as Column).width ?? "100%",
                  height: (header as Row).height ?? "100%",
                }}
              >
                {sortIndicator.index === index && (
                  <div
                    className={cx(
                      styles.sort_indicator,
                      sortIndicator.position ?? "before"
                    )}
                  />
                )}
              </div>
            )
          )}
        </div>
      )}
      <div className={styles.table_container}>
        <table className={styles.table} id={TABLE_ID} tabIndex={0}>
          <thead className="sr">
            <tr>
              <th />
              {columns.map((_, x) => (
                <th key={x}>{getHeaderLabel(x, "column")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, y) => {
              return (
                <tr key={y}>
                  <th className="sr">{getHeaderLabel(y, "row")}</th>
                  {columns.map((column) => {
                    const id = getCellId(column.id, row.id);
                    const isSelected =
                      selection?.columnId === column.id &&
                      selection?.rowId === row.id;
                    const isEditing =
                      edition?.columnId === column.id &&
                      edition?.rowId === row.id;

                    return (
                      <Cell
                        cellId={id}
                        className={styles.cell}
                        expression={getCellExpression(column.id, row.id)}
                        height={row.height}
                        isEditing={isEditing}
                        isSelected={isSelected}
                        key={id}
                        onCommit={(value, direction) => {
                          setCellValue(column.id, row.id, value);

                          if (direction === "down" && rows[y + 1]) {
                            selectCell(column.id, rows[y + 1].id);
                          }

                          setEdition(null);
                        }}
                        onEndEditing={() => setEdition(null)}
                        onSelect={() => selectCell(column.id, row.id)}
                        onStartEditing={() =>
                          setEdition({ columnId: column.id, rowId: row.id })
                        }
                        other={others[id]}
                        value={cells[id]}
                        width={column.width}
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

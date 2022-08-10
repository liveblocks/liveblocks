import { type ComponentProps, useCallback, useState, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { GRID_MAX_COLUMNS, GRID_MAX_ROWS } from "../constants";
import { convertNumberToLetter } from "../spreadsheet/interpreter/utils";
import type { ReactSpreadsheet } from "../spreadsheet/react";
import { getCellId } from "../spreadsheet/utils";
import type { CellAddress } from "../types";
import { TABLE_ID, canUseHotkeys } from "../utils/canUseHotkeys";
import { clamp } from "../utils/clamp";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";
import { Cell } from "./Cell";
import { Headers } from "./Headers";
import styles from "./Sheet.module.css";

export type Props = ComponentProps<"div"> & ReactSpreadsheet;

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
  const [edition, setEdition] = useState<CellAddress | null>(null);
  const shouldUseHotkeys = useMemo(
    () => Boolean(selection && !edition),
    [selection, edition]
  );
  const hotkeysOptions = useMemo(
    () => ({ enabled: shouldUseHotkeys, filter: canUseHotkeys }),
    [shouldUseHotkeys]
  );

  const moveSelection = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
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
    [selection]
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
    "delete",
    (event) => {
      event.preventDefault();
      deleteCell(selection!.columnId, selection!.rowId);
    },
    hotkeysOptions,
    [selection]
  );

  return (
    <div className={styles.sheet}>
      <Headers
        className={styles.columns}
        clearHeader={clearColumn}
        deleteHeader={deleteColumn}
        columns={columns}
        rows={rows}
        cells={cells}
        insertHeader={insertColumn}
        moveHeader={moveColumn}
        resizeHeader={resizeColumn}
        selectedHeader={selection?.columnId}
        type="column"
        max={GRID_MAX_COLUMNS}
      />
      <Headers
        className={styles.rows}
        clearHeader={clearRow}
        deleteHeader={deleteRow}
        columns={columns}
        rows={rows}
        cells={cells}
        insertHeader={insertRow}
        moveHeader={moveRow}
        resizeHeader={resizeRow}
        selectedHeader={selection?.rowId}
        type="row"
        max={GRID_MAX_ROWS}
      />
      <div className={styles.table_container}>
        <table className={styles.table} id={TABLE_ID} tabIndex={0}>
          <thead className="sr">
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
                  <th className="sr">{y}</th>
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
                        key={id}
                        cellId={id}
                        className={styles.cell}
                        value={cells[id]}
                        expression={getCellExpression(column.id, row.id)}
                        height={row.height}
                        isSelected={isSelected}
                        isEditing={isEditing}
                        onStartEditing={() =>
                          setEdition({ columnId: column.id, rowId: row.id })
                        }
                        onEndEditing={() => setEdition(null)}
                        onDelete={() => deleteCell(column.id, row.id)}
                        onSelect={() => selectCell(column.id, row.id)}
                        onCommit={(value, direction) => {
                          setCellValue(column.id, row.id, value);

                          if (direction === "down" && rows[y + 1]) {
                            selectCell(column.id, rows[y + 1].id);
                          }

                          setEdition(null);
                        }}
                        other={others[id]}
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

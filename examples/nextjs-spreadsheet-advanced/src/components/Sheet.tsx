import { type ComponentProps, useCallback } from "react";
import { GRID_MAX_COLUMNS, GRID_MAX_ROWS } from "../constants";
import { convertNumberToLetter } from "../spreadsheet/interpreter/utils";
import type { ReactSpreadsheet } from "../spreadsheet/react";
import { TABLE_ID, canUseShortcuts } from "../utils/canUseShortcuts";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";
import { useEventListener } from "../utils/useEventListener";
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
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!selection || !canUseShortcuts()) {
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const index = getIndexWithProperty(rows, "id", selection.rowId);

        if (event.key === "ArrowUp" && index > 0) {
          event.preventDefault();
          selectCell(selection.columnId, rows[index - 1].id);
        } else if (event.key === "ArrowDown" && index < rows.length - 1) {
          event.preventDefault();
          selectCell(selection.columnId, rows[index + 1].id);
        }
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const index = getIndexWithProperty(columns, "id", selection.columnId);

        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          selectCell(columns[index - 1].id, selection.rowId);
        } else if (event.key === "ArrowRight" && index < columns.length - 1) {
          event.preventDefault();
          selectCell(columns[index + 1].id, selection.rowId);
        }
      }
    },
    [selection, rows, selectCell, columns]
  );

  useEventListener("keydown", handleKeyDown);

  return (
    <div className={styles.sheet}>
      <Headers
        className={styles.columns}
        clearHeader={clearColumn}
        deleteHeader={deleteColumn}
        headers={columns}
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
        headers={rows}
        insertHeader={insertRow}
        moveHeader={moveRow}
        resizeHeader={resizeRow}
        selectedHeader={selection?.rowId}
        type="row"
        max={GRID_MAX_ROWS}
      />
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
                  const isSelected =
                    selection?.columnId === column.id &&
                    selection?.rowId === row.id;

                  return (
                    <Cell
                      className={styles.cell}
                      expression={cells[column.id + row.id]}
                      getExpression={() => getCellExpression(column.id, row.id)}
                      height={row.height}
                      isSelected={isSelected}
                      key={column.id + row.id}
                      onDelete={() => deleteCell(column.id, row.id)}
                      onSelect={() => selectCell(column.id, row.id)}
                      onValueChange={(value) =>
                        setCellValue(column.id, row.id, value)
                      }
                      other={others[column.id + row.id]}
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
  );
}

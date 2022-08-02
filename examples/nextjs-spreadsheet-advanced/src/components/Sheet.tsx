import { ComponentProps, useCallback } from "react";
import { convertNumberToLetter } from "../spreadsheet/interpreter/utils";
import { ReactSpreadsheet } from "../spreadsheet/react";
import { Headers } from "./Headers";
import { Cell } from "./Cell";
import styles from "./Sheet.module.css";
import { getIndexWithProperty } from "../utils/getIndexWithProperty";
import { useEventListener } from "../utils/useEventListener";
import { canUseShortcuts, TABLE_ID } from "../utils/canUseShortcuts";

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
    [selection, columns, rows]
  );

  useEventListener("keydown", handleKeyDown);

  return (
    <div className={styles.sheet}>
      <Headers
        type="column"
        className={styles.columns}
        headers={columns}
        selectedHeader={selection?.columnId}
        moveHeader={moveColumn}
        clearHeader={clearColumn}
        deleteHeader={deleteColumn}
        resizeHeader={resizeColumn}
        insertHeader={insertColumn}
      />
      <Headers
        type="row"
        className={styles.rows}
        headers={rows}
        selectedHeader={selection?.rowId}
        moveHeader={moveRow}
        clearHeader={clearRow}
        deleteHeader={deleteRow}
        resizeHeader={resizeRow}
        insertHeader={insertRow}
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
                {columns.map((column, x) => {
                  const isSelected =
                    selection?.columnId === column.id &&
                    selection?.rowId === row.id;

                  return (
                    <Cell
                      key={column.id + row.id}
                      className={styles.cell}
                      onSelect={() => selectCell(column.id, row.id)}
                      onValueChange={(value) =>
                        setCellValue(column.id, row.id, value)
                      }
                      onDelete={() => deleteCell(column.id, row.id)}
                      getExpression={() => getCellExpression(column.id, row.id)}
                      expression={cells[column.id + row.id]}
                      width={column.width}
                      height={row.height}
                      other={others[column.id + row.id]}
                      isSelected={isSelected}
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

import { ComponentProps } from "react";
import { convertNumberToLetter } from "../spreadsheet/interpreter/utils";
import { ReactSpreadsheet } from "../spreadsheet/react";
import { Headers } from "./Headers";
import { Cell } from "./Cell";
import styles from "./Sheet.module.css";

export type Props = ComponentProps<"div"> & ReactSpreadsheet;

export function Sheet({
  cells,
  columns,
  rows,
  moveColumn,
  moveRow,
  deleteColumn,
  deleteRow,
  resizeColumn,
  resizeRow,
  insertColumn,
  insertRow,
  selectCell,
  setCellValue,
  getExpression,
  selections,
}: Props) {
  return (
    <div className={styles.sheet}>
      <Headers
        type="column"
        className={styles.columns}
        headers={columns}
        moveHeader={moveColumn}
        deleteHeader={deleteColumn}
        resizeHeader={resizeColumn}
        insertHeader={insertColumn}
      />
      <Headers
        type="row"
        className={styles.rows}
        headers={rows}
        moveHeader={moveRow}
        deleteHeader={deleteRow}
        resizeHeader={resizeRow}
        insertHeader={insertRow}
      />
      <table className={styles.table} tabIndex={0}>
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
                  return (
                    <Cell
                      key={column.id + row.id}
                      className={styles.cell}
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
  );
}

import type { NextPage } from "next";
import styles from "./index.module.css";
import { Cell } from "../src/Cell";
import { useSpreadsheet } from "../src/hooks";

const ROW_HEADER_WIDTH = 40;

const Home: NextPage = () => {
  const spreadsheet = useSpreadsheet();

  if (spreadsheet == null) {
    return <div>Loading...</div>;
  }

  const {
    columns,
    rows,
    cells,
    selectionMap,
    selectCell,
    deleteColumn,
    deleteRow,
    moveColumn,
    insertColumn,
    insertRow,
    getExpression,
    setCellValue,
  } = spreadsheet;

  return (
    <div className={styles.sheet_container}>
      <table className={styles.sheet} onBlur={() => selectCell(null)}>
        <colgroup>
          <col span={1} style={{ width: ROW_HEADER_WIDTH + "px" }} />
          {columns.map((column) => (
            <col span={1} style={{ width: column.width + "px" }} />
          ))}
        </colgroup>
        <tbody>
          <tr>
            <th style={{ width: ROW_HEADER_WIDTH + "px", height: "24px" }} />
            {columns.map((column, x) => {
              return (
                <th style={{ width: column.width + "px" }}>
                  <div className={`${styles.column_header} ${styles.hidden}`}>
                    {x > 0 && (
                      <button
                        className={styles.move_left}
                        onClick={() => moveColumn(x, x - 1)}
                      >
                        ←
                      </button>
                    )}
                    <button
                      className={styles.delete_column}
                      onClick={() => deleteColumn(x)}
                    >
                      ×
                    </button>
                    {x < columns.length - 1 && (
                      <button
                        className={styles.move_right}
                        onClick={() => moveColumn(x, x + 1)}
                      >
                        →
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
          {rows.map((row, y) => {
            return (
              <tr style={{ height: row.height + "px" }}>
                <th>
                  <button
                    className={`${styles.delete_row} ${styles.hidden}`}
                    onClick={() => deleteRow(y)}
                  >
                    ×
                  </button>
                </th>
                {columns.map((column, x) => {
                  return (
                    <td
                      className={styles.cell}
                      style={{
                        width: column.width + "px",
                        height: row.height + "px",
                      }}
                      onClick={() =>
                        selectCell({ columnId: column.id, rowId: row.id })
                      }
                    >
                      <Cell
                        key={column.id + row.id}
                        onChange={(newValue) =>
                          setCellValue(column.id, row.id, newValue)
                        }
                        getExpression={() => getExpression(column.id, row.id)}
                        displayValue={cells[column.id + row.id]}
                        width={column.width}
                        height={row.height}
                        selectionColor={selectionMap[column.id + row.id]}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        className={`${styles.add_column} ${styles.hidden}`}
        onClick={() => insertColumn(columns.length, 100)}
      >
        +
      </button>
      <button
        className={`${styles.add_row} ${styles.hidden}`}
        onClick={() => insertRow(rows.length, 30)}
      >
        +
      </button>
    </div>
  );
};

export default Home;

import type { User } from "@liveblocks/client";
import { useCallback, useEffect, useState } from "react";
import { useRoom } from "../liveblocks.config";
import type {
  CellAddress,
  Column,
  Presence,
  Row,
  UserInfo,
  UserMeta,
} from "../types";
import { type Spreadsheet, createSpreadsheet } from ".";

export interface ReactSpreadsheet {
  cells: Record<string, string>;
  clearColumn: Spreadsheet["clearColumn"];
  clearRow: Spreadsheet["clearRow"];
  columns: Column[];
  deleteCell: Spreadsheet["deleteCell"];
  deleteColumn: Spreadsheet["deleteColumn"];
  deleteRow: Spreadsheet["deleteRow"];
  getCellExpression: Spreadsheet["getCellExpression"];
  getCellValue: Spreadsheet["getCellValue"];
  insertColumn: Spreadsheet["insertColumn"];
  insertRow: Spreadsheet["insertRow"];
  moveColumn: Spreadsheet["moveColumn"];
  moveRow: Spreadsheet["moveRow"];
  others: Record<string, UserInfo>;
  resizeColumn: Spreadsheet["resizeColumn"];
  resizeRow: Spreadsheet["resizeRow"];
  rows: Row[];
  selectCell: Spreadsheet["selectCell"];
  selection: CellAddress | null;
  setCellValue: Spreadsheet["setCellValue"];
  users: readonly User<Presence, UserMeta>[];
}

export function useSpreadsheet(): ReactSpreadsheet | null {
  const room = useRoom();
  const [spreadsheet, setSpreadsheet] = useState<Spreadsheet | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<readonly User<Presence, UserMeta>[]>([]);
  const [selection, setSelection] = useState<CellAddress | null>(null);
  const [others, setOthers] = useState<Record<string, UserInfo>>({});

  const selectCell = useCallback(
    (columnId: string, rowId: string) => {
      setSelection({ columnId, rowId });
      spreadsheet?.selectCell(columnId, rowId);
    },
    [spreadsheet]
  );

  useEffect(() => {
    createSpreadsheet(room).then((spreadsheet) => {
      spreadsheet.onColumnsChange(setColumns);
      spreadsheet.onRowsChange(setRows);
      spreadsheet.onCellsChange(setCells);
      spreadsheet.onOthersChange((others) => {
        setUsers(others);
        setOthers(
          others.reduce<Record<string, UserInfo>>((previous, current) => {
            if (current.presence?.selectedCell) {
              previous[current.presence.selectedCell] = current.info;
            }

            return previous;
          }, {})
        );
      });

      setSpreadsheet(spreadsheet);
    });
  }, [room]);

  useEffect(() => {
    if (!selection && columns.length > 0 && rows.length > 0) {
      selectCell(columns[0].id, rows[0].id);
    }
  }, [columns, rows, selection, selectCell]);

  return spreadsheet !== null
    ? {
        insertRow: spreadsheet.insertRow,
        resizeRow: spreadsheet.resizeRow,
        moveRow: spreadsheet.moveRow,
        clearRow: spreadsheet.clearRow,
        deleteRow: spreadsheet.deleteRow,
        insertColumn: spreadsheet.insertColumn,
        resizeColumn: spreadsheet.resizeColumn,
        moveColumn: spreadsheet.moveColumn,
        clearColumn: spreadsheet.clearColumn,
        deleteColumn: spreadsheet.deleteColumn,
        getCellExpression: spreadsheet.getCellExpression,
        getCellValue: spreadsheet.getCellValue,
        setCellValue: spreadsheet.setCellValue,
        deleteCell: spreadsheet.deleteCell,
        selectCell: selectCell,
        rows,
        columns,
        cells,
        users,
        selection,
        others,
      }
    : null;
}

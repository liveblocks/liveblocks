import { User } from "@liveblocks/client";
import { useRoom } from "../liveblocks.config";
import { useState, useEffect, useCallback } from "react";
import {
  CellAddress,
  Column,
  Presence,
  Row,
  UserInfo,
  UserMeta,
} from "../types";
import { createSpreadsheet, Spreadsheet } from ".";

export interface ReactSpreadsheet {
  insertRow: Spreadsheet["insertRow"];
  resizeRow: Spreadsheet["resizeRow"];
  moveRow: Spreadsheet["moveRow"];
  clearRow: Spreadsheet["clearRow"];
  deleteRow: Spreadsheet["deleteRow"];
  insertColumn: Spreadsheet["insertColumn"];
  resizeColumn: Spreadsheet["resizeColumn"];
  moveColumn: Spreadsheet["moveColumn"];
  clearColumn: Spreadsheet["clearColumn"];
  deleteColumn: Spreadsheet["deleteColumn"];
  selectCell: Spreadsheet["selectCell"];
  deleteCell: Spreadsheet["deleteCell"];
  getCellExpression: Spreadsheet["getCellExpression"];
  setCellValue: Spreadsheet["setCellValue"];
  getCellValue: Spreadsheet["getCellValue"];
  rows: Row[];
  columns: Column[];
  cells: Record<string, string>;
  users: User<Presence, UserMeta>[];
  selection: CellAddress | null;
  others: Record<string, UserInfo>;
}

export function useSpreadsheet(): ReactSpreadsheet | null {
  const room = useRoom();
  const [spreadsheet, setSpreadsheet] = useState<Spreadsheet | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User<Presence, UserMeta>[]>([]);
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
    if (!selection && columns.length && rows.length) {
      selectCell(columns[0].id, rows[0].id);
    }
  }, [columns, rows, selection, selectCell]);

  return spreadsheet != null
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

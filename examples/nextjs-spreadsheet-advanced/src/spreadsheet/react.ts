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
  deleteRow: Spreadsheet["deleteRow"];
  insertColumn: Spreadsheet["insertColumn"];
  resizeColumn: Spreadsheet["resizeColumn"];
  moveColumn: Spreadsheet["moveColumn"];
  deleteColumn: Spreadsheet["deleteColumn"];
  getExpression: Spreadsheet["getCellExpressionDisplay"];
  selectCell: Spreadsheet["selectCell"];
  setCellValue: Spreadsheet["updateCellValue"];
  rows: Row[];
  columns: Column[];
  cells: Record<string, string>;
  users: User<Presence, UserMeta>[];
  selection: CellAddress | null;
  selections: Record<string, UserInfo>;
}

export function useSpreadsheet(): ReactSpreadsheet | null {
  const room = useRoom();
  const [spreadsheet, setSpreadsheet] = useState<Spreadsheet | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User<Presence, UserMeta>[]>([]);
  const [selection, setSelection] = useState<CellAddress | null>(null);
  const [selections, setSelections] = useState<Record<string, UserInfo>>({});

  useEffect(() => {
    createSpreadsheet(room).then((spreadsheet) => {
      spreadsheet.onColumnsChange(setColumns);
      spreadsheet.onRowsChange(setRows);
      spreadsheet.onCellsChange(setCells);
      spreadsheet.onOthersChange((others) => {
        setUsers(others);
        setSelections(
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

  const selectCell = useCallback((columnId: string, rowId: string) => {
    setSelection({ columnId, rowId });
    spreadsheet?.selectCell(columnId, rowId);
  }, []);

  return spreadsheet != null
    ? {
        insertRow: spreadsheet.insertRow,
        resizeRow: spreadsheet.resizeRow,
        moveRow: spreadsheet.moveRow,
        deleteRow: spreadsheet.deleteRow,

        insertColumn: spreadsheet.insertColumn,
        resizeColumn: spreadsheet.resizeColumn,
        moveColumn: spreadsheet.moveColumn,
        deleteColumn: spreadsheet.deleteColumn,

        getExpression: spreadsheet.getCellExpressionDisplay,
        selectCell: selectCell,
        setCellValue: spreadsheet.updateCellValue,

        rows,
        columns,
        cells,

        users,
        selection,
        selections,
      }
    : null;
}

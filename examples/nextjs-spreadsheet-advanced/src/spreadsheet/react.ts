import { useRoom } from "../liveblocks.config";
import { useState, useEffect } from "react";
import { Column, Row, UserInfo, UserMeta } from "../types";
import { createSpreadsheet, LiveSpreadsheet } from ".";

export function useSpreadsheet() {
  const room = useRoom();
  const [spreadsheet, setSpreadsheet] = useState<LiveSpreadsheet | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [selections, setSelections] = useState<Record<string, UserInfo>>({});

  useEffect(() => {
    createSpreadsheet(room).then((spreadsheet) => {
      spreadsheet.onColumnsChange(setColumns);
      spreadsheet.onRowsChange(setRows);
      spreadsheet.onCellsChange(setCells);
      spreadsheet.onOthersChange((others) => {
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
        selectCell: spreadsheet.selectedCell,
        setCellValue: spreadsheet.updateCellValue,

        rows,
        columns,
        cells,
        selections,
      }
    : null;
}

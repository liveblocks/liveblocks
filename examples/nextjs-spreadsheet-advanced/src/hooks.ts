import { Column, Row, useRoom } from "../liveblocks.config";
import { useState, useEffect } from "react";
import { createSpreadsheet, LiveSpreadsheet } from "../spreadsheet";

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

export function useSpreadsheet() {
  const room = useRoom();
  const [spreadsheet, setSpreadsheet] = useState<LiveSpreadsheet | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [selectionMap, setSelectionMap] = useState<Record<string, string>>({});

  useEffect(() => {
    createSpreadsheet(room).then((spreadsheet) => {
      spreadsheet.onColumnsChange(setColumns);
      spreadsheet.onRowsChange(setRows);
      spreadsheet.onCellsChange(setCells);
      spreadsheet.onOthersChange((others) => {
        setSelectionMap(
          others.reduce<Record<string, string>>((prev, current) => {
            if (current.presence?.selectedCell) {
              prev[current.presence.selectedCell] =
                COLORS[current.connectionId % COLORS.length];
              return prev;
            } else {
              return prev;
            }
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
        selectionMap,
      }
    : null;
}

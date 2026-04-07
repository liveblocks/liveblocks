"use client";

import { useState, useCallback } from "react";
import { LiveObject } from "@liveblocks/client";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import type { RowData } from "../liveblocks.config";
import { getBotDisplayName } from "../lib/users";
import { useAiTablePresence } from "./useAiTablePresence";

const cellInner =
  "box-border flex min-h-9 w-full items-center px-3 py-2 text-left text-[13px] leading-snug text-stone-800";

export function Table() {
  const title = useStorage((root) => root.title);
  const columns = useStorage((root) => root.columns);
  const rows = useStorage((root) => root.rows);
  const aiPresence = useAiTablePresence();

  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    column: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const updateCell = useMutation(
    ({ storage }, rowIndex: number, column: string, value: string) => {
      const rowsList = storage.get("rows");
      const current = rowsList.get(rowIndex) as RowData | undefined;
      if (current) {
        rowsList.set(rowIndex, { ...current, [column]: value });
      }
    },
    []
  );

  const addRow = useMutation(({ storage }) => {
    const rowsList = storage.get("rows");
    const columnsList = storage.get("columns");
    const cols = columnsList.toImmutable();
    const newRow: RowData = { id: `row-${Date.now()}` };
    cols.forEach((col) => {
      newRow[col] = "";
    });
    rowsList.push(new LiveObject(newRow));
  }, []);

  const deleteRow = useMutation(({ storage }, rowIndex: number) => {
    const rowsList = storage.get("rows");
    rowsList.delete(rowIndex);
  }, []);

  const handleCellClick = useCallback(
    (rowIndex: number, column: string, currentValue: string) => {
      setEditingCell({ rowIndex, column });
      setEditValue(currentValue);
    },
    []
  );

  const handleCellBlur = useCallback(() => {
    if (editingCell) {
      updateCell(editingCell.rowIndex, editingCell.column, editValue);
      setEditingCell(null);
    }
  }, [editingCell, editValue, updateCell]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleCellBlur();
      } else if (e.key === "Escape") {
        setEditingCell(null);
      }
    },
    [handleCellBlur]
  );

  const columnsArray = columns ? columns.map((c) => c) : [];
  const rowsArray = rows ? rows.map((r) => r) : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="text-xl font-medium tracking-tight text-stone-900">
          {title || "Untitled"}
        </h1>
      </header>

      <div className="overflow-hidden rounded-md border border-stone-200/90 bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/90">
              {columnsArray.map((column, index) => (
                <th
                  key={index}
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-stone-500"
                >
                  {column}
                </th>
              ))}
              <th className="w-10 px-2 py-2.5" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rowsArray.map((row, rowIndex) => {
              const aiStart = aiPresence?.focusedRowIndex;
              const aiEnd =
                aiPresence?.focusedRowIndexEnd ?? aiPresence?.focusedRowIndex;
              const isAiFocusRow =
                aiStart != null &&
                aiEnd != null &&
                rowIndex >= aiStart &&
                rowIndex <= aiEnd;
              const showAiBadge =
                isAiFocusRow && aiStart === rowIndex;

              return (
              <tr
                key={row.id || rowIndex}
                className={
                  isAiFocusRow
                    ? "relative z-1 border-b border-stone-100 bg-amber-50/35 shadow-[inset_0_0_0_2px_rgb(196,154,108)] last:border-0"
                    : "border-b border-stone-100 last:border-0"
                }
              >
                {columnsArray.map((column, colIndex) => {
                  const isEditing =
                    editingCell?.rowIndex === rowIndex &&
                    editingCell?.column === column;
                  const cellValue = row[column] || "";
                  const isFirstCol = colIndex === 0;

                  return (
                    <td
                      key={column}
                      className={
                        showAiBadge && isFirstCol
                          ? "relative p-0 align-top"
                          : "p-0 align-top"
                      }
                    >
                      {showAiBadge && isFirstCol && (
                        <span
                          className="absolute left-2 top-0 z-10 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm"
                          style={{ backgroundColor: "#c4986a" }}
                        >
                          {getBotDisplayName()}
                        </span>
                      )}
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className={`${cellInner} m-0 border-0 bg-white shadow-[inset_0_0_0_1px_rgb(214,211,209)] outline-none focus:shadow-[inset_0_0_0_2px_rgb(168,162,158)]`}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleCellClick(rowIndex, column, cellValue)
                          }
                          className={`${cellInner} border-0 bg-transparent hover:bg-stone-50`}
                        >
                          {cellValue || (
                            <span className="text-stone-300">—</span>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="p-0 align-middle">
                  <div className="flex min-h-9 items-center justify-center px-1">
                    <button
                      type="button"
                      onClick={() => deleteRow(rowIndex)}
                      className="rounded p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600"
                      title="Remove row"
                      aria-label="Remove row"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>

        {rowsArray.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-stone-400">
            No rows yet.
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900 hover:decoration-stone-500"
        >
          Add row
        </button>
      </div>
    </div>
  );
}

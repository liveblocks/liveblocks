"use client"

import {
  CommandBar,
  CommandBarBar,
  CommandBarCommand,
  CommandBarSeparator,
  CommandBarValue,
} from "@/components/CommandBar"
import { RowSelectionState, Table } from "@tanstack/react-table"

type DataTableBulkEditorProps<TData> = {
  table: Table<TData>
  rowSelection: RowSelectionState
}

function DataTableBulkEditor<TData>({
  table,
  rowSelection,
}: DataTableBulkEditorProps<TData>) {
  const hasSelectedRows = Object.keys(rowSelection).length > 0
  return (
    <CommandBar open={hasSelectedRows}>
      <CommandBarBar>
        <CommandBarValue>
          {Object.keys(rowSelection).length} selected
        </CommandBarValue>
        <CommandBarSeparator />
        <CommandBarCommand
          label="Edit"
          action={() => {
            console.log("Edit")
          }}
          shortcut={{ shortcut: "e" }}
        />
        <CommandBarSeparator />
        <CommandBarCommand
          label="Delete"
          action={() => {
            console.log("Delete")
          }}
          shortcut={{ shortcut: "d" }}
        />
        <CommandBarSeparator />
        <CommandBarCommand
          label="Reset"
          action={() => {
            table.resetRowSelection()
          }}
          shortcut={{ shortcut: "Escape", label: "esc" }}
          // don't disable this command
        />
      </CommandBarBar>
    </CommandBar>
  )
}

export { DataTableBulkEditor }

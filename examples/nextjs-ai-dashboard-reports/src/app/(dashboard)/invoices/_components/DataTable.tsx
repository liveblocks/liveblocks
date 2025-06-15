"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/Table"
import { cx } from "@/lib/utils"
import * as React from "react"

import { DataTablePagination } from "./DataTablePagination"

import { DataTableBulkEditor } from "./TableBulkEditor"

import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  onRowClick?: (row: Row<TData>) => void
}

export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const pageSize = 20
  const [rowSelection, setRowSelection] = React.useState({})
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: pageSize,
      },
    },
    enableRowSelection: true,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <div className="space-y-3">
        <div className="relative overflow-hidden overflow-x-auto">
          <Table>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-y border-gray-200 dark:border-gray-800"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHeaderCell
                      key={header.id}
                      className={cx(
                        "whitespace-nowrap py-1",
                        header.column.columnDef.meta?.className,
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group select-none hover:bg-gray-50 hover:dark:bg-gray-900"
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        className={cx(
                          row.getIsSelected()
                            ? "bg-gray-50 dark:bg-gray-900"
                            : "",
                          "relative whitespace-nowrap py-2 text-gray-700 first:w-10 dark:text-gray-300",
                          cell.column.columnDef.meta?.className,
                        )}
                      >
                        {index === 0 && row.getIsSelected() && (
                          <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-500 dark:bg-blue-500" />
                        )}
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <DataTableBulkEditor table={table} rowSelection={rowSelection} />
        </div>
        <DataTablePagination table={table} pageSize={pageSize} />
      </div>
    </>
  )
}

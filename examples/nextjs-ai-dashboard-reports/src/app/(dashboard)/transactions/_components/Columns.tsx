"use client"

import { Badge, BadgeProps } from "@/components/Badge"
import { Button } from "@/components/Button"
import { Checkbox } from "@/components/Checkbox"
import { expense_statuses, Transaction } from "@/data/schema"
import { formatters } from "@/lib/utils"
import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table"
import { format } from "date-fns"
import { Ellipsis } from "lucide-react"
import { DataTableColumnHeader } from "./DataTableColumnHeader"

const columnHelper = createColumnHelper<Transaction>()

export const getColumns = ({
  onEditClick,
}: {
  onEditClick: (row: Row<Transaction>) => void
}) =>
  [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomeRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={() => table.toggleAllPageRowsSelected()}
          className="translate-y-0.5"
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => row.toggleSelected()}
          className="translate-y-0.5"
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        displayName: "Select",
      },
    }),
    columnHelper.accessor("transaction_date", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Purchased on" />
      ),
      cell: ({ getValue }) => {
        const date = getValue()
        return format(new Date(date), "MMM dd, yyyy 'at' h:mma")
      },
      enableSorting: true,
      enableHiding: false,
      meta: {
        className: "tabular-nums",
        displayName: "Purchased",
      },
    }),
    columnHelper.accessor("expense_status", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      enableSorting: true,
      meta: {
        className: "text-left",
        displayName: "Status",
      },
      cell: ({ row }) => {
        const statusValue = row.getValue("expense_status")
        const status = expense_statuses.find(
          (item) => item.value === statusValue,
        )
        if (!status) {
          return statusValue // Fallback to displaying the raw status
        }
        return (
          <Badge variant={status.variant as BadgeProps["variant"]}>
            {status.label}
          </Badge>
        )
      },
    }),
    columnHelper.accessor("merchant", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Merchant" />
      ),
      enableSorting: false,
      meta: {
        className: "text-left",
        displayName: "Merchant",
      },
      filterFn: "arrIncludesSome",
    }),
    columnHelper.accessor("category", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      enableSorting: false,
      meta: {
        className: "text-left",
        displayName: "Category",
      },
    }),
    columnHelper.accessor("amount", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      enableSorting: true,
      meta: {
        className: "text-right",
        displayName: "Amount",
      },
      cell: ({ getValue }) => {
        return (
          <span className="font-medium">
            {formatters.currency({ number: getValue() })}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: "edit",
      header: "Edit",
      enableSorting: false,
      enableHiding: false,
      meta: {
        className: "text-right",
        displayName: "Edit",
      },
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => onEditClick?.(row)}
            className="group aspect-square p-1.5 hover:border hover:border-gray-300 data-[state=open]:border-gray-300 data-[state=open]:bg-gray-50 hover:dark:border-gray-700 data-[state=open]:dark:border-gray-700 data-[state=open]:dark:bg-gray-900"
          >
            <Ellipsis
              className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-data-[state=open]:text-gray-700 group-hover:dark:text-gray-300 group-data-[state=open]:dark:text-gray-300"
              aria-hidden="true"
            />
          </Button>
        )
      },
    }),
  ] as ColumnDef<Transaction>[]

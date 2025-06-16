import { Column } from "@tanstack/react-table"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cx } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cx(className)}>{title}</div>
  }

  return (
    <div
      onClick={column.getToggleSortingHandler()}
      className={cx(
        column.columnDef.enableSorting === true
          ? "-mx-2 inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 select-none hover:bg-neutral-50 dark:hover:bg-neutral-900"
          : "",
      )}
    >
      <span>{title}</span>
      {column.getCanSort() ? (
        <div className="scale-80 -space-y-2">
          <ChevronUp
            className={cx(
              "size-3.5 text-neutral-500",
              column.getIsSorted() === "desc" ? "opacity-30" : "",
            )}
            aria-hidden="true"
          />
          <ChevronDown
            className={cx(
              "size-3.5 text-neutral-500",
              column.getIsSorted() === "asc" ? "opacity-30" : "",
            )}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  )
}

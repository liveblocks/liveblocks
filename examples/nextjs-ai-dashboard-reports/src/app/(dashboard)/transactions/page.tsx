"use client"
import { getColumns } from "./_components/Columns"
import { DataTable } from "./_components/DataTable"
import { transactions } from "@/data/transactions"
import React from "react"

export default function Example() {
  const columns = getColumns({ onEditClick: () => {} })

  return (
    <>
      <h1 className="text-lg font-semibold tracking-[-0.01em] text-neutral-900 sm:text-xl dark:text-neutral-50">
        Transactions
      </h1>
      <div className="mt-4 sm:mt-6 lg:mt-10">
        <DataTable data={transactions} columns={columns} />
      </div>
    </>
  )
}

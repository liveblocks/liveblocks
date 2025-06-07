"use client";
import { getColumns } from "./_components/Columns";
import { DataTable } from "./_components/DataTable";
// import { DataTableDrawer } from "./_components/DataTableDrawer";
// import { Invoice } from "@/data/schema";
import { invoices } from "@/data/invoices";
// import { Row } from "@tanstack/react-table ";
import React from "react";

export default function Example() {
  // const [row, setRow] = React.useState<Row<Invoice> | null>(null);
  // const [isOpen, setIsOpen] = React.useState(false);
  // const datas = row?.original;

  const columns = getColumns({
    onEditClick: (row) => {
      // setRow(row);
      // setIsOpen(true);
    },
  });

  return (
    <>
      <h1 className="text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
        Invoices
      </h1>
      <div className="mt-4 sm:mt-6 lg:mt-10">
        <DataTable
          data={invoices}
          columns={columns}
          onRowClick={(row) => {
            // setRow(row);
            // setIsOpen(true);
          }}
        />
        {/* <DataTableDrawer open={isOpen} onOpenChange={setIsOpen} datas={datas} /> */}
      </div>
    </>
  );
}

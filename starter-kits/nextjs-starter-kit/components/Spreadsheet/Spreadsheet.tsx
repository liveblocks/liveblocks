"use client";

import dynamic from "next/dynamic";
import { DocumentSpinner } from "@/primitives/Spinner";

const SpreadsheetComponent = dynamic(
  () => import("./SpreadsheetTable").then((mod) => mod.SpreadsheetTable),
  {
    ssr: false,
    loading: () => <DocumentSpinner />,
  }
);

export function Spreadsheet() {
  return <SpreadsheetComponent />;
}

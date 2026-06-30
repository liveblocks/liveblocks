"use client";

import dynamic from "next/dynamic";
import { DocumentSpinner } from "@/primitives/Spinner";
import styles from "./Spreadsheet.module.css";

const SpreadsheetComponent = dynamic(
  () => import("./SpreadsheetTable").then((mod) => mod.SpreadsheetTable),
  {
    ssr: false,
    loading: () => <DocumentSpinner />,
  }
);

export function Spreadsheet() {
  return (
    <div className={styles.shell}>
      <SpreadsheetComponent />
    </div>
  );
}

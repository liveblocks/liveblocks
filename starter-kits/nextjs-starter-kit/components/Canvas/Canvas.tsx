"use client";

import dynamic from "next/dynamic";
import { DocumentSpinner } from "@/primitives/Spinner";

// Dynamically import the Canvas component
// This ensures TLDraw and its dependencies are only loaded client-side
const CanvasComponent = dynamic(
  () => import("./TldrawCanvas").then((mod) => mod.TldrawCanvas),
  {
    ssr: false,
    loading: () => <DocumentSpinner />,
  }
);

export function Canvas() {
  return <CanvasComponent />;
}

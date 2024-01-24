import { ReactNode } from "react";
import { DOCUMENTS } from "../../database";

export async function generateStaticParams() {
  return DOCUMENTS.map((document) => ({ document }));
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

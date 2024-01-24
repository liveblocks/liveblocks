import { ReactNode } from "react";
import { ROOMS } from "../../database";

export async function generateStaticParams() {
  return ROOMS.map((room) => ({ room }));
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

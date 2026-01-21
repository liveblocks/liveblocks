import { ReactNode } from "react";
import { getRooms } from "../../../database";

/**
 * Generate dynamic routes for each room.
 */
export async function generateStaticParams() {
  const rooms = await getRooms();

  return rooms.map((room) => ({ room: room.slug }));
}

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

import { Sidebar } from "../../components/Sidebar";
import { TenantHeader } from "../../components/TenantHeader";
import { getRooms } from "../../database";
import "../../styles/globals.css";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rooms = await getRooms();

  return (
    <>
      <main className="home">{children}</main>
      <Sidebar rooms={rooms} />
      <TenantHeader />
    </>
  );
}

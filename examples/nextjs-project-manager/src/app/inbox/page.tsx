import { Inbox } from "@/components/Inbox";
import { Nav } from "@/components/Nav";

export default function PageInbox() {
  return (
    <div className="flex flex-row h-full">
      <nav className="p-2 w-[250px]">
        <Nav />
      </nav>
      <main className="m-2 border flex-grow bg-neutral-50 rounded flex flex-row overflow-hidden">
        <div className="border-r w-[400px]">
          <Inbox />
        </div>
        <div className="flex-grow bg-neutral-100 flex justify-center items-center">
          Select a notification
        </div>
      </main>
    </div>
  );
}

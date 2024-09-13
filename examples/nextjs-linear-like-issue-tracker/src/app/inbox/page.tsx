import { Inbox } from "@/components/Inbox";
import { Nav } from "@/components/Nav";

export default function PageHome() {
  return (
    <div className="flex flex-row h-full">
      <nav className="p-2 w-[200px] xl:w-[250px]">
        <Nav />
      </nav>
      <main className="m-2 border flex-grow bg-neutral-50 rounded flex flex-row overflow-hidden">
        <div className="border-r w-[300px]">
          <Inbox />
        </div>
        <div className="flex-grow flex items-center justify-center text-sm text-neutral-500 font-medium">
          Select an issue
        </div>
      </main>
    </div>
  );
}

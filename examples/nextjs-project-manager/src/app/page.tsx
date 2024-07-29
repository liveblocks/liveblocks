import { Room } from "@/app/Room";
import { Logo } from "@/components/Logo";
import RoomErrors from "@/components/RoomErrors";
import { Issue } from "@/components/Issue";

export default function PageHome() {
  return (
    <Room>
      <div className="flex flex-row h-full">
        <nav className="p-2 w-[250px]">
          <div>Liveblocks</div>
        </nav>
        <main className="m-2 border flex-grow bg-gray-50 rounded">
          <Issue />
        </main>
      </div>
      <RoomErrors />
    </Room>
  );
}

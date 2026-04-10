import Link from "next/link";
import { EXAMPLES } from "./examples";
import { ResetRoomButton } from "./reset-room-button";

export default function Home() {
  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">
      <h1 className="text-2xl font-bold mb-4">Examples</h1>

      <div className="flex flex-col gap-4">
        {Object.entries(EXAMPLES).map(([name, example]) => (
          <div key={name} className="flex items-center gap-3">
            <Link href={`/${name}`} className="underline">
              {example.label}
            </Link>
            <ResetRoomButton roomId={example.roomId} />
          </div>
        ))}
      </div>
    </main>
  );
}

import Link from "next/link";
import { Liveblocks } from "@liveblocks/node";

async function getDocRooms() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return [];
  }

  const client = new Liveblocks({ secret });
  const page = await client.getRooms({ limit: 100 });

  function roomTitle(room: (typeof page.data)[0]): string {
    const raw = room.metadata?.title;
    if (typeof raw === "string") {
      return raw;
    }
    if (Array.isArray(raw) && typeof raw[0] === "string") {
      return raw[0];
    }
    return room.id;
  }

  return page.data
    .filter((room) => room.id.startsWith("doc-"))
    .map((room) => ({
      id: room.id,
      title: roomTitle(room),
    }));
}

export default async function Home() {
  const rooms = await getDocRooms();

  return (
    <div className="min-h-screen px-6 py-14 text-stone-800">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-medium tracking-tight text-stone-900">
          Liveblocks Chat
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Mention <span className="text-stone-700">@Acme AI</span> in Slack or
          comments. Tables live at <code className="text-stone-600">/doc-…</code>
          .
        </p>

        <h2 className="mt-10 text-xs font-medium uppercase tracking-wide text-stone-400">
          Documents
        </h2>
        {rooms.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">
            No documents yet. Create one from Slack first.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 rounded-md border border-stone-200 bg-white">
            {rooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/${room.id}`}
                  className="flex flex-col gap-0.5 px-3 py-2.5 text-sm transition-colors hover:bg-stone-50"
                >
                  <span className="font-medium text-stone-900">
                    {room.title}
                  </span>
                  <span className="font-mono text-xs text-stone-400">
                    {room.id}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";

export function Nav() {
  return (
    <div>
      <div className="text-sm font-semibold p-2 flex justify-between items-center mb-2">
        <Link href="/">Liveblocks</Link>
        <button className="bg-white rounded px-2 py-0.5 shadow-sm border border-neutral-200 text">
          + New
        </button>
      </div>
      <Link className="" href="/inbox">
        <div className="text-sm text-neutral-700 font-semibold p-2 bg-gray-200 rounded">
          Inbox
        </div>
      </Link>
    </div>
  );
}

import Link from "next/link";
import { CreateNewIssue } from "@/components/CreateNewIssue";

export function Nav() {
  return (
    <div>
      <div className="text-sm font-semibold p-2 flex justify-between items-center mb-2">
        <Link href="/">Liveblocks</Link>
        <CreateNewIssue />
      </div>
      <Link className="" href="/inbox">
        <div className="text-sm text-neutral-700 font-semibold p-2 bg-gray-200 rounded">
          Inbox
        </div>
      </Link>
    </div>
  );
}

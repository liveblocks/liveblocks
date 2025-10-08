import Link from "next/link";
import { nanoid } from "nanoid";

export function NewLink() {
  return (
    <Link
      href={`/${nanoid()}`}
      className="bg-white ring-1 ring-neutral-200 text-sm font-medium px-1.5 py-1 rounded-md shadow-sm hover:bg-neutral-50"
    >
      + New
    </Link>
  );
}

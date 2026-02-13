import Link from "next/link";

const EXAMPLES = [
  {
    href: "/table",
    title: "Table Comments",
    description: "Comment directly on table cells.",
  },
  {
    href: "/canvas",
    title: "Canvas Comments",
    description: "Drop pins anywhere on a canvas.",
  },
  {
    href: "/presence",
    title: "Presence",
    description: "See who is currently online.",
  },
];

export default function HomePage() {
  return (
    <main className="max-w-[800px] mx-auto px-4 py-12 flex flex-col gap-6">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
        Liveblocks Comments Playground
      </h1>
      <p className="text-gray-500 dark:text-gray-400">
        Pick an example to explore comments and presence.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <Link
            key={example.href}
            href={example.href}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <h2 className="font-medium text-gray-900 dark:text-white">
              {example.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {example.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

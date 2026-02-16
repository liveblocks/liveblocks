import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-[800px] mx-auto px-4 py-12 flex flex-col gap-6">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
        Liveblocks Comments Playground
      </h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/table"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          Table Comments
        </Link>
        <Link
          href="/ag-grid"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          AG Grid Comments
        </Link>
        <Link
          href="/canvas"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          Canvas Comments
        </Link>
        <Link
          href="/presence"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          Presence
        </Link>
      </div>
    </main>
  );
}

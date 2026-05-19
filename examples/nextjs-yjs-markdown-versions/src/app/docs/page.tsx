import { createDoc, listMyDocsPage } from "./actions";
import { DocsList } from "./DocsList";

export default async function DocsIndexPage() {
  // Prefetch the first page on the server so we render with content on the
  // initial paint. SWR will revalidate (and load more pages) on the client.
  const firstPage = await listMyDocsPage();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-8 pb-16 pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[22px] font-semibold tracking-tight">
            Your documents
          </h1>
          <p className="text-text-muted text-[13px]">
            Every document is a Liveblocks room. Every version inside it is a{" "}
            <code className="bg-bg-muted border-border font-mono rounded border px-1 text-xs">
              Y.Text
            </code>{" "}
            in the room&apos;s Yjs document.
          </p>
        </div>
        <form action={createDoc} className="flex gap-2">
          <input
            name="title"
            type="text"
            placeholder="New document title"
            className="border-border-strong bg-bg-elev text-text h-[34px] w-60 rounded-lg border px-3 text-[13px] outline-none"
          />
          <button
            type="submit"
            className="bg-accent text-accent-fg h-[34px] cursor-pointer rounded-lg border border-transparent px-3.5 text-[13px] font-semibold"
          >
            Create
          </button>
        </form>
      </div>

      <DocsList initialFirstPage={firstPage} />
    </div>
  );
}

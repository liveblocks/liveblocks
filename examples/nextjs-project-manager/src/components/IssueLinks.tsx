"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { Trash } from "@/icons/Trash";
import { getPreviewData, LinkPreviewMetadata } from "@/actions/preview";
import { Delete } from "@/icons/Delete";
import { Plus } from "@/icons/Plus";
import { Submit } from "@/icons/Submit";

export function IssueLinks() {
  return (
    <ClientSideSuspense fallback={null}>
      <Links />
    </ClientSideSuspense>
  );
}

function Links() {
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState("");
  const links = useStorage((root) => root.links);

  const addLink = useMutation(
    ({ storage }, e) => {
      e.preventDefault();

      // Already added
      if (storage.get("links").findIndex((val) => val === url) !== -1) {
        return;
      }

      storage.get("links").push(url);
      setCreating(false);
      setUrl("");
    },
    [url]
  );

  const removeLink = useMutation(({ storage }, index) => {
    storage.get("links").delete(index);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center text-sm font-medium text-neutral-500">
        Links{" "}
        <button onClick={() => setCreating(!creating)}>
          {creating ? (
            <span>
              <span className="sr-only">Close new link</span>
              <Delete className="w-4 h-4" />
            </span>
          ) : (
            <span>
              <span className="sr-only">New Link</span>
              <Plus className="w-4 h-4" />
            </span>
          )}
        </button>
      </div>
      {creating ? (
        <form
          className="flex justify-between items-center border border-neutral-200 has-[:focus]:border-neutral-400 rounded-lg overflow-hidden shadow-sm bg-white my-2"
          onSubmit={addLink}
        >
          <input
            placeholder="https://..."
            className="px-3 py-2 flex-grow rounded-lg outline-0 text-sm"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <button className="text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-2">
            <span className="sr-only">Add new link</span>
            <Submit className="w-4 h-4" />
          </button>
        </form>
      ) : null}
      <div>
        {links.map((link, index) => (
          <LinkPreview
            key={link}
            link={link}
            onRemove={() => removeLink(index)}
          />
        ))}
      </div>
    </div>
  );
}

function LinkPreview({
  link,
  onRemove,
}: {
  link: string;
  onRemove: () => void;
}) {
  const [metadata, setMetadata] = useState<LinkPreviewMetadata>({
    title: null,
    description: null,
    canonical: null,
    icon: null,
  });

  useEffect(() => {
    async function run() {
      const { data, error } = await getPreviewData(link);

      if (error || !data) {
        return;
      }

      setMetadata(data);
    }

    run();
  }, [link]);

  return (
    <div className="text-sm flex justify-between items-center border border-neutral-200 rounded-lg max-w-full shadow-sm bg-white my-2 cursor-pointer w-full overflow-hidden">
      <div className="flex items-center gap-2 whitespace-nowrap flex-grow-1 flex-shrink-1 truncate px-3 py-2">
        <img
          src={`https://www.google.com/s2/favicons?domain=${new URL(link).hostname}?size=32`}
          alt=""
          className="w-4 h-4 flex-shrink-0 flex-grow-0"
        />
        <span className="font-medium">
          {metadata.title || metadata.canonical || link}
        </span>
        {metadata.description ? (
          <span className="truncate text-neutral-500 flex-shrink-[100]">
            {metadata.description}
          </span>
        ) : null}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors px-3 py-2"
      >
        <span className="sr-only">Remove link</span>
        <Trash className="w-4 h-4" />
      </button>
    </div>
  );
}

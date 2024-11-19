"use client";

import {
  ClientSideSuspense,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RubbishIcon } from "@/icons/RubbishIcon";
import { getPreviewData, LinkPreviewMetadata } from "@/actions/preview";
import { DeleteIcon } from "@/icons/DeleteIcon";
import { PlusIcon } from "@/icons/PlusIcon";
import { SubmitIcon } from "@/icons/SubmitIcon";
import { ImmutableStorage } from "@/liveblocks.config";

export function IssueLinks({
  storageFallback,
}: {
  storageFallback: ImmutableStorage;
}) {
  return (
    <ClientSideSuspense
      fallback={
        <div>
          <div className="flex justify-between items-center text-sm font-medium text-neutral-500">
            Links{" "}
          </div>
          {storageFallback.links ? (
            <div>
              {storageFallback.links.toReversed().map((link: string) => (
                <LinkPreview key={link} link={link} onlyPlaceholder={true} />
              ))}
            </div>
          ) : null}
        </div>
      }
    >
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

      // Already added, no duplicates
      if (storage.get("links").findIndex((val) => val === url) !== -1) {
        return;
      }

      storage.get("links").push(url);
      setCreating(false);
      setUrl("");
    },
    [url]
  );

  const removeLink = useMutation(({ storage }, link) => {
    const index = storage.get("links").findIndex((val) => val === link);
    storage.get("links").delete(index);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center text-sm font-medium text-neutral-500">
        Links
        <button onClick={() => setCreating(!creating)}>
          {creating ? (
            <span>
              <span className="sr-only">Close new link</span>
              <DeleteIcon className="w-4 h-4" />
            </span>
          ) : (
            <span>
              <span className="sr-only">New Link</span>
              <PlusIcon className="w-4 h-4" />
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
            <SubmitIcon className="w-4 h-4" />
          </button>
        </form>
      ) : null}
      <div>
        {links.toReversed().map((link) => (
          <LinkPreview
            key={link}
            link={link}
            onRemove={() => removeLink(link)}
          />
        ))}
      </div>
    </div>
  );
}

function LinkPreview({
  link,
  onlyPlaceholder = false,
  onRemove,
}: {
  link: string;
  onlyPlaceholder?: boolean;
  onRemove?: () => void;
}) {
  const [loading, setLoading] = useState(true);

  const [metadata, setMetadata] = useState<LinkPreviewMetadata>({
    title: null,
    description: null,
    canonical: null,
  });

  useEffect(() => {
    if (onlyPlaceholder) {
      return;
    }

    async function run() {
      const { data, error } = await getPreviewData(link);
      setLoading(false);

      if (error || !data) {
        return;
      }

      setMetadata(data);
    }

    run();
  }, [link, onlyPlaceholder]);

  return (
    <div className="isolate relative h-10 text-sm flex justify-between items-center border border-neutral-200 rounded-lg max-w-full shadow-sm bg-white my-2 cursor-pointer w-full overflow-hidden">
      <Link
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inset-0 absolute"
      />
      {loading ? (
        <div className="flex w-full justify-between items-center px-3 py-2 gap-2">
          <span className="flex items-center gap-2">
            <div className="animate-pulse w-4 h-4 bg-neutral-100 rounded"></div>
            <span className="font-medium text-neutral-500">
              {new URL(link).hostname}
            </span>
          </span>
          <div className="animate-pulse w-4 h-4 bg-neutral-100 rounded"></div>
        </div>
      ) : (
        <>
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
            className="z-10 flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors px-3 py-2"
          >
            <span className="sr-only">Remove link</span>
            <RubbishIcon className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

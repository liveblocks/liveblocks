"use client";

import type { LiveMap } from "@liveblocks/client";
import { useMutation, useSelf } from "@liveblocks/react/suspense";
import { ExternalLink, X } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { useMemo } from "react";
import type { TLShape } from "tldraw";
import {
  getHtmlBoxDataFromShapeLike,
  normalizeShapeLikeRecord,
} from "@/lib/htmlBox";
import { htmlToReactComponent } from "@/lib/htmlToReact";

type StorageRecord = Liveblocks["Storage"]["records"] extends LiveMap<
  string,
  infer TValue
>
  ? TValue
  : never;

export function HtmlBoxDrawer({
  fileId,
  selectedShapes,
  open,
  onClose,
}: {
  fileId: string;
  selectedShapes: TLShape[];
  open: boolean;
  onClose: () => void;
}) {
  const canWrite = useSelf((me) => me.canWrite);
  const selectedHtmlShape = useMemo(() => {
    return selectedShapes.find((shape) => getHtmlBoxDataFromShapeLike(shape));
  }, [selectedShapes]);
  const selectedData = selectedHtmlShape
    ? getHtmlBoxDataFromShapeLike(selectedHtmlShape)
    : null;
  const reactComponent = useMemo(
    () => htmlToReactComponent(selectedData?.html ?? ""),
    [selectedData?.html]
  );

  const saveTitle = useMutation(
    ({ storage }, payload: { id: string; title: string }) => {
      if (!canWrite) {
        return;
      }
      const records = storage.get("records");
      const existing = records.get(payload.id);
      if (!existing || typeof existing !== "object") {
        return;
      }

      const existingRecord = existing as Record<string, unknown>;
      const existingProps =
        typeof existingRecord.props === "object" && existingRecord.props !== null
          ? (existingRecord.props as Record<string, unknown>)
          : {};
      const nextRecord = normalizeShapeLikeRecord({
        ...existingRecord,
        props: {
          ...existingProps,
          title: payload.title,
          updatedAt: new Date().toISOString(),
        },
      });
      records.set(payload.id, nextRecord as unknown as StorageRecord);
    },
    [canWrite]
  );

  if (!open) {
    return null;
  }

  return (
    <aside className="z-20 flex h-full w-[420px] shrink-0 flex-col border-l border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Code</p>
          <h3 className="text-sm font-semibold text-neutral-900">
            {selectedHtmlShape ? "Selected box" : "No HTML box selected"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1 text-neutral-500 hover:bg-neutral-50"
        >
          <X size={18} />
        </button>
      </div>

      {!selectedHtmlShape ? (
        <div className="p-4 text-sm text-neutral-500">
          Select an AI-generated HTML box to inspect its React component.
        </div>
      ) : (
        <div key={selectedHtmlShape.id} className="flex min-h-0 flex-1 flex-col">
          <form
            className="space-y-3 border-b border-neutral-200 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const titleValue =
                String(formData.get("title") ?? "").trim() || "Generated UI";
              saveTitle({ id: selectedHtmlShape.id, title: titleValue });
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Title
              </span>
              <div className="flex gap-2">
                <input
                  name="title"
                  defaultValue={selectedData?.title ?? ""}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
                >
                  Save
                </button>
              </div>
            </label>
            <a
              href={`/files/readonly/${fileId}/${encodeURIComponent(selectedHtmlShape.id)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-sm hover:border-neutral-300"
            >
              <ExternalLink size={14} />
              Preview in new window
            </a>
          </form>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <p className="mb-2 text-xs font-medium text-neutral-600">
              React component
            </p>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-neutral-200 bg-neutral-50">
              <Highlight
                theme={themes.vsLight}
                code={reactComponent}
                language="jsx"
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className={`${className} m-0 w-max min-w-full whitespace-pre p-3 font-mono text-xs`}
                    style={{ ...style, background: "transparent" }}
                  >
                    {tokens.map((line, lineIndex) => (
                      <div key={lineIndex} {...getLineProps({ line })}>
                        {line.map((token, tokenIndex) => (
                          <span
                            key={tokenIndex}
                            {...getTokenProps({ token })}
                          />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

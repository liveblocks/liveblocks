"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { getHtmlBoxDataFromShapeLike } from "@/lib/htmlBox";

function iframeDocument(html: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </head>
  <body>
    ${html}
  </body>
</html>`;
}

export function ShapeReadonlyPreview({ shapeId }: { shapeId: string }) {
  const record = useStorage((root) => root.records[shapeId]);
  const boxData =
    record && typeof record === "object"
      ? getHtmlBoxDataFromShapeLike(record as Record<string, unknown>)
      : null;

  if (!boxData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-neutral-900">Preview unavailable</h1>
          <p className="mt-2 text-sm text-neutral-600">
            This shape is not an HTML box or no longer exists.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-neutral-200 px-4 py-3">
        <h1 className="text-sm font-semibold text-neutral-900">{boxData.title}</h1>
      </header>
      <iframe
        title={boxData.title}
        sandbox="allow-same-origin"
        srcDoc={iframeDocument(boxData.html)}
        className="h-[calc(100vh-49px)] w-full border-0"
      />
    </main>
  );
}

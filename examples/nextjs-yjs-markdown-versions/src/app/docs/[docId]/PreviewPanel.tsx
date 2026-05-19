"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";

import { PanelHeader, panelShellClass } from "./PanelChrome";

export function PreviewPanel({
  yDoc,
  version,
  versionIndex,
}: {
  yDoc: Y.Doc;
  version: VersionInfo;
  versionIndex: number;
}) {
  const [text, setText] = useState<string>(() =>
    getVersionText(yDoc, version.id).toString()
  );

  useEffect(() => {
    const yText = getVersionText(yDoc, version.id);
    const update = () => setText(yText.toString());
    update();
    yText.observe(update);
    return () => yText.unobserve(update);
  }, [yDoc, version.id]);

  return (
    <div className={panelShellClass}>
      <PanelHeader
        label={`Preview · v${versionIndex + 1}`}
        meta={new Date(version.createdAt).toLocaleString()}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-5">
        {text.trim().length === 0 ? (
          <p className="text-text-muted text-sm">
            <em>This version is empty.</em>
          </p>
        ) : (
          <article className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

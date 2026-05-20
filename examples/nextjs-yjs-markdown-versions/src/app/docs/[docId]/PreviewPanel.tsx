"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";
import { LocalTime } from "@/components/LocalTime";
import { useIsDark } from "@/lib/use-is-dark";

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
  const isDark = useIsDark();

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
        meta={<LocalTime date={version.createdAt} />}
      />
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-5">
        {text.trim().length === 0 ? (
          <p className="text-text-muted text-sm">
            <em>This version is empty.</em>
          </p>
        ) : (
          <article className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  // react-markdown v9 invokes this component for both
                  // inline `\`code\`` and fenced code blocks. Fenced
                  // blocks carry a `language-XXX` class — that's how
                  // we tell them apart.
                  const match = /language-([\w+-]+)/.exec(className ?? "");
                  if (!match) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <SyntaxHighlighter
                      language={match[1]}
                      style={isDark ? oneDark : oneLight}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        padding: "12px 14px",
                        borderRadius: 8,
                        fontSize: 12.5,
                        background: isDark
                          ? "rgb(var(--bg-muted))"
                          : "rgb(var(--bg-muted))",
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily: "var(--font-mono)",
                          fontSize: "inherit",
                        },
                      }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                },
              }}
            >
              {text}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

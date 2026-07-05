import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

export function HtmlComponentView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const prompt = readStringAttr(node.attrs.prompt);
  const html = readStringAttr(node.attrs.html);
  const [inputPrompt, setInputPrompt] = useState(prompt);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const renderedHtml = previewHtml ?? html;
  const isEditing = isGenerating || !html || previewHtml !== null;

  useEffect(() => {
    if (!html) {
      inputRef.current?.focus();
    }
  }, [html]);

  useEffect(() => {
    setInputPrompt(prompt);
  }, [prompt]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function generate(nextPrompt: string) {
    const trimmedPrompt = nextPrompt.trim();

    if (!trimmedPrompt || isGenerating) {
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setError(null);
    setIsGenerating(true);
    setPreviewHtml("");

    try {
      const response = await fetch("/api/generate-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to generate HTML");
      }

      if (!response.body) {
        throw new Error("The response did not include a stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let nextHtml = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          nextHtml += decoder.decode();
          break;
        }

        nextHtml += decoder.decode(value, { stream: true });
        setPreviewHtml(stripMarkdownFences(nextHtml));
      }

      const finalHtml = stripMarkdownFences(nextHtml);

      updateAttributes({
        prompt: trimmedPrompt,
        html: finalHtml,
      });
      setPreviewHtml(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setError(
        error instanceof Error ? error.message : "Failed to generate HTML"
      );
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void generate(inputPrompt);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();

    if (event.key === "Escape") {
      if (html) {
        setPreviewHtml(null);
      } else {
        deleteNode();
      }
    }
  }

  return (
    <NodeViewWrapper
      className="my-4 rounded-2xl border border-border bg-card shadow-sm"
      contentEditable={false}
    >
      {isEditing ? (
        <div className="p-4">
          <form
            className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
            onSubmit={onSubmit}
          >
            <SparklesIcon />
            <input
              ref={inputRef}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Describe an interactive HTML component..."
              value={inputPrompt}
              disabled={isGenerating}
              onChange={(event) => setInputPrompt(event.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!inputPrompt.trim() || isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </form>

          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}

          {renderedHtml ? (
            <HtmlPreview html={renderedHtml} label="Generating preview" />
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Press Enter to create an interactive HTML box with AI.
            </div>
          )}
        </div>
      ) : (
        <div className="group relative p-3">
          <div className="absolute right-5 top-5 z-10 hidden gap-2 group-hover:flex">
            <button
              type="button"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium shadow-sm"
              onClick={() => {
                setPreviewHtml("");
                setInputPrompt(prompt);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium shadow-sm"
              onClick={() => void generate(prompt)}
            >
              Regenerate
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium shadow-sm"
              onClick={deleteNode}
            >
              Delete
            </button>
          </div>
          <HtmlPreview html={html} label={prompt || "Generated HTML"} />
        </div>
      )}
    </NodeViewWrapper>
  );
}

function HtmlPreview({ html, label }: { html: string; label: string }) {
  return (
    <iframe
      className="mt-3 h-[360px] w-full rounded-xl border border-border bg-white"
      title={label}
      sandbox="allow-scripts"
      srcDoc={html}
    />
  );
}

function readStringAttr(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stripMarkdownFences(html: string) {
  return html
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function SparklesIcon() {
  return (
    <svg
      className="size-4 flex-none text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6-4.6-1.9 4.6-1.9z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

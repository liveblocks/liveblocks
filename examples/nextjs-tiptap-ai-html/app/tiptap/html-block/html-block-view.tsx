"use client";

import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const EXAMPLE_PROMPTS = ["ROI calculator", "Quiz", "Countdown timer"];
const MIN_IFRAME_HEIGHT = 120;
const MAX_IFRAME_HEIGHT = 800;

type GenerateHtmlResponse = {
  html: string;
};

export function HtmlBlockView({
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const prompt = getStringAttribute(node.attrs.prompt);
  const html = getStringAttribute(node.attrs.html);
  const [blockId] = useState(() => createBlockId());
  const [input, setInput] = useState(prompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{
    prompt: string;
    refine: boolean;
  } | null>(null);
  const [iframeHeight, setIframeHeight] = useState(MIN_IFRAME_HEIGHT);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingPrompt) {
      setInput(prompt);
    }
  }, [isEditingPrompt, prompt]);

  // Focus the prompt input on mount, but only when this client just inserted
  // the block (its selection is at the block). Blocks inserted by remote
  // collaborators, or present when the document loads, must not steal focus.
  useEffect(() => {
    if (node.attrs.html !== "") {
      return;
    }

    const pos = getPos();

    if (pos === undefined) {
      return;
    }

    const { from } = editor.state.selection;

    if (from >= pos && from <= pos + node.nodeSize + 1) {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Edit prompt" is always a local action, so focusing is safe here
  useEffect(() => {
    if (isEditingPrompt) {
      inputRef.current?.focus();
    }
  }, [isEditingPrompt]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;

      if (!isHeightMessage(data) || data.id !== blockId) {
        return;
      }

      setIframeHeight(clamp(data.height, MIN_IFRAME_HEIGHT, MAX_IFRAME_HEIGHT));
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [blockId]);

  const iframeHtml = useMemo(() => {
    return html ? withResizeScript(html, blockId) : "";
  }, [blockId, html]);

  async function generate(nextPrompt: string, refine: boolean) {
    const trimmedPrompt = nextPrompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    updateAttributes({ prompt: trimmedPrompt });
    setLastRequest({ prompt: trimmedPrompt, refine });
    setError(null);
    setIsGenerating(true);
    setIsEditingPrompt(false);

    try {
      const response$ = fetch("/api/generate-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          currentHtml: refine ? html : undefined,
        }),
      });
      const response = await response$;

      if (!response.ok) {
        throw new Error("HTML generation failed");
      }

      const data$: Promise<unknown> = response.json();
      const data = await data$;

      if (!isGenerateHtmlResponse(data)) {
        throw new Error("HTML generation returned an invalid response");
      }

      updateAttributes({ html: data.html, prompt: trimmedPrompt });
      setInput(trimmedPrompt);
    } catch (error) {
      console.error(error);
      setError("Could not generate HTML. Check your OpenAI key and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    generate(input, Boolean(html && isEditingPrompt));
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") {
      return;
    }

    if (html) {
      event.preventDefault();
      cancelEditing();
    } else if (input.trim() === "") {
      event.preventDefault();
      deleteNode();
    }
  }

  function cancelEditing() {
    setIsEditingPrompt(false);
    setError(null);
    setInput(prompt);
  }

  function retry() {
    if (lastRequest) {
      generate(lastRequest.prompt, lastRequest.refine);
    }
  }

  const wrapperClassName = `my-6 rounded-xl ${
    selected ? "ring-2 ring-blue-500 ring-offset-2" : ""
  }`;

  if (isGenerating) {
    return (
      <NodeViewWrapper className={wrapperClassName} contentEditable={false}>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 animate-pulse items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <SparklesIcon />
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-card-foreground">
                Generating HTML...
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {lastRequest?.prompt || prompt || input}
              </p>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  if (!html || isEditingPrompt || error) {
    return (
      <NodeViewWrapper className={wrapperClassName} contentEditable={false}>
        <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/40 p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <SparklesIcon />
              </div>
              <div>
                <p className="m-0 text-sm font-medium text-card-foreground">
                  {html ? "Refine HTML component" : "Create HTML component"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Describe an interactive component to generate.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={
                html ? "Cancel editing prompt" : "Remove HTML component"
              }
              onClick={html ? cancelEditing : deleteNode}
            >
              <CloseIcon />
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div>{error}</div>
              {lastRequest ? (
                <button
                  type="button"
                  className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                  onClick={retry}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          <form className="flex gap-2" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={input}
              placeholder="Describe your idea..."
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
            />
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={input.trim() === ""}
            >
              Generate
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="py-1">Try:</span>
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-full border border-border bg-background px-2.5 py-1 transition hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setInput(example);
                  inputRef.current?.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className={wrapperClassName} contentEditable={false}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <iframe
          className="block w-full bg-white"
          srcDoc={iframeHtml}
          sandbox="allow-scripts"
          title={prompt ? `HTML component: ${prompt}` : "HTML component"}
          style={{ height: iframeHeight }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-3 py-2">
          <p className="m-0 min-w-0 flex-1 truncate text-xs italic text-muted-foreground">
            {prompt || "AI-generated HTML component"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => {
                setInput(prompt);
                setError(null);
                setIsEditingPrompt(true);
              }}
            >
              Edit prompt
            </button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => generate(prompt, false)}
            >
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function getStringAttribute(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isGenerateHtmlResponse(value: unknown): value is GenerateHtmlResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "html" in value &&
    typeof value.html === "string"
  );
}

function isHeightMessage(
  value: unknown
): value is { type: "html-block-height"; id: string; height: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "html-block-height" &&
    "id" in value &&
    typeof value.id === "string" &&
    "height" in value &&
    typeof value.height === "number"
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `html-block-${Math.random().toString(36).slice(2)}`;
}

function withResizeScript(html: string, id: string) {
  const serializedId = JSON.stringify(id);
  const script = `<script>
(() => {
  const id = ${serializedId};
  const sendHeight = () => {
    const body = document.body;
    const root = document.documentElement;
    const height = Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      root ? root.scrollHeight : 0,
      root ? root.offsetHeight : 0
    );
    window.parent.postMessage({ type: "html-block-height", id, height }, "*");
  };
  window.addEventListener("load", sendHeight);
  window.addEventListener("resize", sendHeight);
  if ("ResizeObserver" in window) {
    new ResizeObserver(sendHeight).observe(document.body);
  }
  setTimeout(sendHeight, 0);
})();
</script>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}</body>`);
  }

  return `${html}${script}`;
}

function SparklesIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

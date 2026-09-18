"use client";

import { useFeeds, useOthers } from "@liveblocks/react";
import { useNodesData, useReactFlow } from "@xyflow/react";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Play,
  Terminal,
  Bot,
  Sparkles,
  MessageSquareText,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRun } from "./run-context";
import type { Answer, NodeResultData, RunStatus } from "./runs";
import type { WorkflowSummary } from "./server/liveblocks";
import {
  INPUT_NODE_ID,
  truncate,
  type WorkflowNode,
  type WorkflowNodeType,
} from "./shared";

const MAX_RUNS = 25;

type Tab = "runs" | "api";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function RunStatusIcon({ status }: { status: RunStatus | "skipped" }) {
  switch (status) {
    case "running":
      return <Loader2 className="size-3.5 animate-spin text-violet-600" />;
    case "complete":
      return <Check className="size-3.5 text-emerald-600" />;
    case "error":
      return <AlertCircle className="size-3.5 text-red-600" />;
    case "skipped":
      return <CircleDashed className="size-3.5 text-neutral-400" />;
  }
}

function NodeTypeIcon({ type }: { type: WorkflowNodeType }) {
  switch (type) {
    case "input":
      return <MessageSquareText className="size-3.5 text-neutral-700" />;
    case "jev":
      return <Sparkles className="size-3.5 text-violet-600" />;
    case "llm":
      return <Bot className="size-3.5 text-sky-600" />;
  }
}

function getApiUrl(workflowId: string, exampleId: string | null): string {
  const origin =
    typeof window === "undefined"
      ? "http://localhost:3000"
      : window.location.origin;
  const params = new URLSearchParams({ wait: "true" });

  if (exampleId) {
    params.set("exampleId", exampleId);
  }

  return `${origin}/api/workflows/${workflowId}/runs?${params}`;
}

/* -------------------------------------------------------------------------- */
/*                                  Answers                                   */
/* -------------------------------------------------------------------------- */

function ProbabilityBars({
  probabilities,
  highlight,
}: {
  probabilities: Record<string, number>;
  highlight: string;
}) {
  const entries = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);

  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {entries.map(([key, probability]) => (
        <li key={key} className="flex items-center gap-2 text-[11px]">
          <span
            className={`w-24 truncate font-mono ${
              key === highlight ? "text-violet-700" : "text-neutral-500"
            }`}
          >
            {key}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded bg-neutral-100">
            <span
              className={`block h-full rounded ${
                key === highlight ? "bg-violet-500" : "bg-neutral-300"
              }`}
              style={{ width: `${Math.round(probability * 100)}%` }}
            />
          </span>
          <span className="w-8 text-right tabular-nums text-neutral-500">
            {Math.round(probability * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function AnswerView({ id, answer }: { id: string; answer: Answer }) {
  switch (answer.type) {
    case "choice":
      return (
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-mono text-neutral-700">{id}</span>
            <span className="text-neutral-500">
              → <b className="text-neutral-900">{answer.choice}</b> · confidence{" "}
              {answer.confidence.toFixed(2)}
            </span>
          </div>
          <ProbabilityBars
            probabilities={answer.probabilities}
            highlight={answer.choice}
          />
        </div>
      );
    case "score":
      return (
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-mono text-neutral-700">{id}</span>
            <span className="text-neutral-500">
              → score{" "}
              <b className="text-neutral-900">{answer.score.toFixed(2)}</b> ·
              level {answer.level} · confidence {answer.confidence.toFixed(2)}
            </span>
          </div>
          <ProbabilityBars
            probabilities={answer.probabilities}
            highlight={String(answer.level)}
          />
        </div>
      );
    case "noul": {
      const yes = answer.noul >= answer.threshold;
      return (
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-mono text-neutral-700">{id}</span>
            <span className="text-neutral-500">
              → <b className="text-neutral-900">{yes ? "yes" : "no"}</b> · p={" "}
              {answer.noul.toFixed(2)} (threshold {answer.threshold.toFixed(2)})
            </span>
          </div>
          <div className="relative mt-1 h-1.5 overflow-hidden rounded bg-neutral-100">
            <span
              className={`block h-full rounded ${yes ? "bg-violet-500" : "bg-neutral-300"}`}
              style={{ width: `${Math.round(answer.noul * 100)}%` }}
            />
            <span
              className="absolute top-0 h-full w-px bg-neutral-700"
              style={{ left: `${Math.round(answer.threshold * 100)}%` }}
            />
          </div>
        </div>
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Trace                                    */
/* -------------------------------------------------------------------------- */

function TraceNode({
  message,
  depth,
  onFocus,
}: {
  message: NodeResultData;
  depth: number;
  onFocus: () => void;
}) {
  return (
    <li style={{ paddingLeft: depth * 14 }}>
      <div className="rounded-md border border-neutral-200 bg-white">
        <button
          type="button"
          onClick={onFocus}
          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-neutral-50"
        >
          <NodeTypeIcon type={message.nodeType} />
          <span className="flex-1 truncate text-xs font-medium text-neutral-900">
            {message.label}
          </span>
          {message.activation === "all" ? (
            <span
              className="rounded bg-neutral-900 px-1 text-[10px] font-semibold text-white"
              title="Ran because all incoming handles fired"
            >
              AND
            </span>
          ) : null}
          {message.mock ? (
            <span className="rounded bg-amber-50 px-1 text-[10px] font-medium text-amber-700">
              mock
            </span>
          ) : null}
          <span className="text-[11px] tabular-nums text-neutral-400">
            {formatDuration(message.durationMs)}
          </span>
          <RunStatusIcon status={message.status} />
        </button>

        {message.error ? (
          <p className="border-t border-neutral-100 px-2.5 py-1.5 text-xs text-red-700">
            {message.error}
          </p>
        ) : null}

        {message.nodeType === "input" ? (
          <p className="whitespace-pre-wrap border-t border-neutral-100 px-2.5 py-1.5 text-xs leading-relaxed text-neutral-600">
            {truncate(message.input, 400)}
          </p>
        ) : null}

        {message.answers && Object.keys(message.answers).length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-neutral-100 px-2.5 py-2">
            {Object.entries(message.answers).map(([id, answer]) => (
              <AnswerView key={id} id={id} answer={answer} />
            ))}
          </div>
        ) : null}

        {message.nodeType === "llm" &&
        message.output !== undefined &&
        message.status !== "skipped" ? (
          <p className="whitespace-pre-wrap border-t border-neutral-100 px-2.5 py-1.5 text-xs leading-relaxed text-neutral-700">
            {message.output}
            {message.status === "running" ? (
              <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-violet-500 align-middle" />
            ) : null}
          </p>
        ) : null}

        {message.status === "skipped" ? (
          <p className="border-t border-neutral-100 px-2.5 py-1.5 text-xs text-neutral-400">
            Skipped: nothing to run. Input passed through.
          </p>
        ) : null}
      </div>
    </li>
  );
}

function RunTrace() {
  const { messages, isLoading, selectedRunId } = useRun();
  const reactFlow = useReactFlow<WorkflowNode>();

  // Depth = longest parent chain, so the trace reads as a tree.
  const depths = useMemo(() => {
    const map = new Map<string, number>();

    for (const message of messages) {
      const parentDepths = message.parentNodeIds.map((id) => map.get(id) ?? 0);
      map.set(
        message.nodeId,
        parentDepths.length > 0 ? Math.max(...parentDepths) + 1 : 0
      );
    }

    return map;
  }, [messages]);

  if (!selectedRunId) {
    return (
      <p className="px-1 text-xs text-neutral-400">
        Select a run to see its trace.
      </p>
    );
  }

  if (isLoading && messages.length === 0) {
    return (
      <p className="flex items-center gap-2 px-1 text-xs text-neutral-400">
        <Loader2 className="size-3.5 animate-spin" /> Loading run…
      </p>
    );
  }

  if (messages.length === 0) {
    return (
      <p className="px-1 text-xs text-neutral-400">
        Waiting for the first node…
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {messages.map((message) => (
        <TraceNode
          key={message.nodeId}
          message={message}
          depth={depths.get(message.nodeId) ?? 0}
          onFocus={() =>
            void reactFlow.fitView({
              nodes: [{ id: message.nodeId }],
              duration: 400,
              maxZoom: 1,
              padding: 0.4,
            })
          }
        />
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Run list                                  */
/* -------------------------------------------------------------------------- */

function Viewers({ runId }: { runId: string }) {
  const viewers = useOthers((others) =>
    others
      .filter((other) => other.presence.selectedRunId === runId)
      .map((other) => other.info)
  );

  if (viewers.length === 0) {
    return null;
  }

  return (
    <span
      className="flex -space-x-1"
      title={viewers.map((v) => v.name).join(", ")}
    >
      {viewers.slice(0, 3).map((viewer, index) => (
        <span
          key={index}
          className="size-2.5 rounded-full ring-1 ring-white"
          style={{ background: viewer.color }}
        />
      ))}
    </span>
  );
}

function RunList() {
  const { feeds, isLoading } = useFeeds();
  const { selectedRunId, selectRun } = useRun();

  const runs = useMemo(
    () =>
      [...(feeds ?? [])]
        .sort(
          (a, b) => Number(b.metadata.startedAt) - Number(a.metadata.startedAt)
        )
        .slice(0, MAX_RUNS),
    [feeds]
  );

  // Preview the newest run once, when the panel first loads. After that the
  // selection is the user's: exiting the preview must not re-select a run.
  const didAutoSelect = useRef(false);

  useEffect(() => {
    if (!didAutoSelect.current && selectedRunId === null && runs.length > 0) {
      didAutoSelect.current = true;
      selectRun(runs[0].feedId);
    }
  }, [runs, selectedRunId, selectRun]);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 px-1 text-xs text-neutral-400">
        <Loader2 className="size-3.5 animate-spin" /> Loading runs…
      </p>
    );
  }

  if (runs.length === 0) {
    return (
      <p className="px-1 text-xs text-neutral-400">
        No runs yet. Press Run, or POST to the API.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {runs.map((run) => {
        const selected = run.feedId === selectedRunId;

        return (
          <li key={run.feedId}>
            <button
              type="button"
              // Clicking the selected run again exits the preview.
              onClick={() => selectRun(selected ? null : run.feedId)}
              title={selected ? "Exit run preview" : "Preview this run"}
              className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left ${
                selected
                  ? "border-violet-300 bg-violet-50"
                  : "border-transparent hover:bg-neutral-100"
              }`}
            >
              <RunStatusIcon status={run.metadata.status} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-neutral-800">
                  {run.metadata.input || "(empty input)"}
                </span>
                <span className="block text-[11px] text-neutral-400">
                  {formatTime(Number(run.metadata.startedAt))} ·{" "}
                  {run.metadata.trigger === "api" ? "API" : "test run"}
                  {run.metadata.completedAt
                    ? ` · ${formatDuration(
                        Number(run.metadata.completedAt) -
                          Number(run.metadata.startedAt)
                      )}`
                    : ""}
                </span>
              </span>
              <Viewers runId={run.feedId} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Runs tab                                  */
/* -------------------------------------------------------------------------- */

function RunsTab({
  workflow,
  exampleId,
}: {
  workflow: WorkflowSummary;
  exampleId: string | null;
}) {
  const inputNode = useNodesData<WorkflowNode>(INPUT_NODE_ID);
  const { selectRun } = useRun();
  const [input, setInput] = useState<string | null>(null);
  const [isStarting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sample = inputNode?.type === "input" ? inputNode.data.sample : "";
  const value = input ?? sample;

  async function run() {
    setStarting(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (exampleId) {
        params.set("exampleId", exampleId);
      }

      const response = await fetch(
        `/api/workflows/${workflow.workflowId}/runs${params.size > 0 ? `?${params}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: value, trigger: "test" }),
        }
      );
      const json = (await response.json()) as {
        runId?: string;
        error?: string;
      };

      if (!response.ok || !json.runId) {
        throw new Error(json.error ?? `Request failed (${response.status})`);
      }

      selectRun(json.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-neutral-200 p-3">
        <textarea
          aria-label="Run input"
          value={value}
          rows={4}
          placeholder="Text to send to the input node…"
          onChange={(event) => setInput(event.target.value)}
          className="w-full resize-none rounded-md border border-neutral-200 px-2.5 py-2 text-xs leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-violet-400 focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={isStarting || value.trim() === ""}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isStarting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Run
          </button>
          {input !== null && input !== sample ? (
            <button
              type="button"
              onClick={() => setInput(null)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              Reset to sample
            </button>
          ) : null}
          {error ? (
            <span className="truncate text-xs text-red-600">{error}</span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <Section title="Runs">
          <RunList />
        </Section>
        <Section title="Trace">
          <RunTrace />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   API tab                                  */
/* -------------------------------------------------------------------------- */

type SnippetLanguage = "curl" | "javascript" | "python";

const SNIPPET_LANGUAGES: { id: SnippetLanguage; label: string }[] = [
  { id: "curl", label: "curl" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
];

const SNIPPET_INPUT =
  "I was charged twice for order A-104. Please refund the duplicate.";

function getSnippet(language: SnippetLanguage, url: string): string {
  switch (language) {
    case "curl":
      return [
        `curl -X POST "${url}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '${JSON.stringify({ input: SNIPPET_INPUT })}'`,
      ].join("\n");
    case "javascript":
      return [
        `const response = await fetch(${JSON.stringify(url)}, {`,
        `  method: "POST",`,
        `  headers: { "Content-Type": "application/json" },`,
        `  body: JSON.stringify({`,
        `    input: ${JSON.stringify(SNIPPET_INPUT)},`,
        `  }),`,
        `});`,
        ``,
        `const run = await response.json();`,
        `console.log(run.status, run.nodes);`,
      ].join("\n");
    case "python":
      return [
        `import requests`,
        ``,
        `response = requests.post(`,
        `    ${JSON.stringify(url)},`,
        `    json={"input": ${JSON.stringify(SNIPPET_INPUT)}},`,
        `)`,
        ``,
        `run = response.json()`,
        `print(run["status"], run["nodes"])`,
      ].join("\n");
  }
}

function ApiTab({
  workflow,
  exampleId,
}: {
  workflow: WorkflowSummary;
  exampleId: string | null;
}) {
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(() =>
    getApiUrl(workflow.workflowId, exampleId)
  );

  useEffect(() => {
    setUrl(getApiUrl(workflow.workflowId, exampleId));
  }, [workflow.workflowId, exampleId]);

  const snippet = getSnippet(language, url);

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs text-neutral-600">
      <p className="leading-relaxed">
        Trigger this workflow from anywhere by POSTing JSON with an{" "}
        <code className="rounded bg-neutral-100 px-1">input</code> string. The
        run shows up in the Runs tab for everyone in the room.
      </p>
      <div className="overflow-hidden rounded-md bg-neutral-900">
        <div className="flex items-center gap-0.5 border-b border-neutral-800 px-1.5 py-1">
          {SNIPPET_LANGUAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLanguage(item.id)}
              aria-pressed={language === item.id}
              className={`rounded px-2 py-1 text-[11px] font-medium ${
                language === item.id
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void copy()}
            className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-neutral-300 hover:bg-neutral-700 hover:text-white"
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-neutral-100">
          {snippet}
        </pre>
      </div>
      <ul className="flex flex-col gap-1.5 leading-relaxed">
        <li>
          <code className="rounded bg-neutral-100 px-1">?wait=true</code> blocks
          until the run finishes and returns the full trace as JSON.
        </li>
        <li>
          Without it, the endpoint responds{" "}
          <code className="rounded bg-neutral-100 px-1">202</code> with{" "}
          <code className="rounded bg-neutral-100 px-1">{"{ runId }"}</code>{" "}
          right away while the run streams into the feed.
        </li>
        <li>
          Each Jev node is one TypeSafe request; each LLM node streams through
          the Vercel AI Gateway. Without API keys, both fall back to mocks.
        </li>
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Side panel                                 */
/* -------------------------------------------------------------------------- */

export function SidePanel({
  workflow,
  exampleId,
}: {
  workflow: WorkflowSummary;
  exampleId: string | null;
}) {
  const [tab, setTab] = useState<Tab>("runs");
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Show side panel"
        className="flex w-8 shrink-0 items-center justify-center border-l border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50"
      >
        <ChevronLeft className="size-4" />
      </button>
    );
  }

  return (
    <aside className="flex w-[400px] shrink-0 flex-col border-l border-neutral-200 bg-white">
      <div className="flex h-10 shrink-0 items-center border-b border-neutral-200 px-2">
        {(
          [
            ["runs", "Runs", <Play key="runs" className="size-3.5" />],
            ["api", "API", <Terminal key="api" className="size-3.5" />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${
              tab === id
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Hide side panel"
          className="ml-auto flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {tab === "runs" ? (
        <RunsTab workflow={workflow} exampleId={exampleId} />
      ) : (
        <ApiTab workflow={workflow} exampleId={exampleId} />
      )}
    </aside>
  );
}

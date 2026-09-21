"use client";

import {
  Handle,
  Position,
  useNodeConnections,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import {
  AlertCircle,
  Bot,
  Check,
  CircleDashed,
  FileOutput,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FieldLabel, Select, TextArea, TextField } from "./fields";
import { useRun } from "./run-context";
import {
  getRunOutput,
  type Answer,
  type NodeResultData,
  type NodeStatus,
} from "./runs";
import {
  IN_HANDLE,
  LLM_MODEL_GROUPS,
  LLM_MODELS,
  createOutputProperty,
  createQuestion,
  getActivation,
  getOutputProperties,
  getOutputPropertyId,
  getSourceHandles,
  slugify,
  truncate,
  type ActivationMode,
  type Criterion,
  type HandleDef,
  type InputNode,
  type JevNode,
  type LlmNode,
  type OutputNode,
  type OutputProperty,
  type QuestionDef,
  type QuestionType,
  type WorkflowNode,
  type WorkflowEdge,
} from "./shared";

export const NODE_WIDTH = 272;

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: "Choice",
  score: "Score",
  noul: "Yes / no",
};

/* -------------------------------------------------------------------------- */
/*                                   Frame                                    */
/* -------------------------------------------------------------------------- */

function StatusIcon({ status }: { status: NodeStatus | undefined }) {
  switch (status) {
    case "running":
      return <Loader2 className="size-3.5 animate-spin text-violet-600" />;
    case "complete":
      return <Check className="size-3.5 text-emerald-600" />;
    case "error":
      return <AlertCircle className="size-3.5 text-red-600" />;
    case "skipped":
      return <CircleDashed className="size-3.5 text-neutral-400" />;
    default:
      return null;
  }
}

/**
 * "Runs when" setting for nodes with incoming edges. `all` turns a node with
 * several incoming handles into an AND gate.
 */
function ActivationControl({
  id,
  activation,
  incomingCount,
}: {
  id: string;
  activation: ActivationMode;
  incomingCount: number;
}) {
  const { updateNodeData } = useReactFlow<WorkflowNode>();

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>Runs when</FieldLabel>
      <div className="flex rounded-md bg-neutral-100 p-0.5 text-[11px]">
        {(
          [
            ["any", "Any input fires", "OR"],
            ["all", "All inputs fire", "AND"],
          ] as const
        ).map(([mode, label, short]) => (
          <button
            key={mode}
            type="button"
            onClick={() => updateNodeData(id, { activation: mode })}
            aria-pressed={activation === mode}
            className={`nodrag min-h-7 flex-1 rounded-md px-1.5 py-1 ${
              activation === mode
                ? "bg-white font-medium text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {label} <span className="opacity-60">({short})</span>
          </button>
        ))}
      </div>
      {activation === "all" && incomingCount < 2 ? (
        <p className="text-[11px] leading-relaxed text-amber-700">
          Connect two or more handles into this node to make the AND useful.
        </p>
      ) : null}
    </div>
  );
}

function NodeFrame({
  id,
  node,
  selected,
  icon,
  accent,
  result,
  hasTarget,
  handles,
  summary,
  editor,
}: {
  id: string;
  node: WorkflowNode;
  selected: boolean | undefined;
  icon: ReactNode;
  accent: string;
  result: NodeResultData | undefined;
  hasTarget: boolean;
  handles: HandleDef[];
  summary: ReactNode;
  editor: ReactNode;
}) {
  const { updateNodeData } = useReactFlow<WorkflowNode>();
  const updateNodeInternals = useUpdateNodeInternals();
  const { selectedRunId } = useRun();
  const [isEditing, setEditing] = useState(false);
  const editAreaRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const incoming = useNodeConnections({ id, handleType: "target" });
  const activation = node.type === "input" ? null : getActivation(node.data);
  const handleKey = handles.map((handle) => handle.id).join("|");

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, handleKey, isEditing, updateNodeInternals]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    editAreaRef.current
      ?.querySelector<HTMLElement>("input, textarea, select, button")
      ?.focus({ preventScroll: true });

    const onPointerDown = (event: PointerEvent) => {
      const editArea = editAreaRef.current;

      if (
        !editArea ||
        !(event.target instanceof Node) ||
        editArea.contains(event.target)
      ) {
        return;
      }

      // Fields commit on blur, so save the active draft before unmounting it.
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        editArea.contains(activeElement)
      ) {
        activeElement.blur();
      }

      setEditing(false);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isEditing]);

  const fired = new Set(result?.firedHandles ?? []);
  // Dim nodes that a selected run never reached.
  const dimmed = selectedRunId !== null && result === undefined;

  return (
    <div
      className="workflow-node"
      style={{ width: NODE_WIDTH, opacity: dimmed ? 0.45 : 1 }}
      data-selected={selected ? "" : undefined}
      data-status={result?.status}
    >
      {hasTarget && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={IN_HANDLE}
            className="workflow-handle"
          />
          {activation === "all" ? (
            <span
              className="absolute -left-2 top-1/2 -translate-x-full -translate-y-1/2 rounded bg-neutral-900 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-white"
              title={`Runs only when all ${incoming.length} incoming handles fire`}
            >
              AND
            </span>
          ) : null}
        </>
      )}

      <div className="workflow-node-header">
        <span
          className="workflow-node-icon"
          style={{ color: accent, background: `${accent}12` }}
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 items-center">
          <TextField
            aria-label="Node name"
            fit
            value={node.data.label}
            onCommit={(label) => updateNodeData(id, { label })}
            className="!border-transparent !bg-transparent !font-semibold hover:!border-neutral-200"
          />
        </div>
        <StatusIcon status={result?.status} />
      </div>

      <div
        ref={editAreaRef}
        className={`workflow-node-body px-2.5 py-2 ${isEditing ? "nodrag nopan" : ""}`}
        data-editing={isEditing ? "" : undefined}
      >
        {!isEditing ? (
          <button
            type="button"
            className="workflow-node-edit-button nodrag nopan"
            aria-label={`Edit ${node.data.label}`}
            aria-expanded={false}
            aria-controls={bodyId}
            onClick={(event) => {
              event.stopPropagation();
              setEditing(true);
            }}
          >
            <Pencil className="size-3" /> Edit
          </button>
        ) : null}
        <div id={bodyId}>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              {editor}
              {activation !== null ? (
                <ActivationControl
                  id={id}
                  activation={activation}
                  incomingCount={incoming.length}
                />
              ) : null}
            </div>
          ) : (
            <div className="workflow-node-summary">{summary}</div>
          )}
        </div>
      </div>

      {result?.error && (
        <div className="mx-3 mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {result.error}
        </div>
      )}

      {handles.length > 0 ? (
        <div className="workflow-node-ports">
          {handles.map((handle) => (
            <div
              key={handle.id}
              className="workflow-node-port relative flex h-6 items-center justify-end pr-2.5"
              data-fired={fired.has(handle.id) ? "" : undefined}
              title={handle.title}
            >
              <span
                className={`truncate text-xs ${
                  fired.has(handle.id)
                    ? "font-medium text-violet-700"
                    : "text-neutral-500"
                }`}
              >
                {handle.questionId ? (
                  <span className="text-neutral-400">
                    {handle.questionId} ·{" "}
                  </span>
                ) : null}
                {handle.label}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={handle.id}
                className="workflow-handle"
                data-fired={fired.has(handle.id) ? "" : undefined}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Input node                                 */
/* -------------------------------------------------------------------------- */

const InputNodeView = memo(({ id, data, selected }: NodeProps<InputNode>) => {
  const { updateNodeData } = useReactFlow<WorkflowNode>();
  const { results } = useRun();
  const result = results.get(id);
  const node: InputNode = { id, type: "input", position: { x: 0, y: 0 }, data };

  return (
    <NodeFrame
      id={id}
      node={node}
      selected={selected}
      icon={<MessageSquareText className="size-3.5" />}
      accent="#171717"
      result={result}
      hasTarget={false}
      handles={getSourceHandles(node)}
      summary={
        <p className="text-xs leading-relaxed text-neutral-600">
          {result
            ? truncate(result.input, 160)
            : data.sample
              ? truncate(data.sample, 160)
              : "Text sent to the workflow. Use the Run button or POST to the API."}
        </p>
      }
      editor={
        <label className="flex flex-col gap-1">
          <FieldLabel>Sample input for test runs</FieldLabel>
          <TextArea
            rows={5}
            value={data.sample}
            placeholder="Paste a sample message…"
            onCommit={(sample) => updateNodeData(id, { sample })}
          />
        </label>
      }
    />
  );
});

/* -------------------------------------------------------------------------- */
/*                                  Jev node                                  */
/* -------------------------------------------------------------------------- */

function AnswerBadge({ answer }: { answer: Answer }) {
  switch (answer.type) {
    case "choice":
      return (
        <span>
          <b className="text-neutral-900">{answer.choice}</b> ·{" "}
          {Math.round((answer.probabilities[answer.choice] ?? 0) * 100)}%
        </span>
      );
    case "score":
      return (
        <span>
          score <b className="text-neutral-900">{answer.score.toFixed(2)}</b> ·
          level {answer.level}
        </span>
      );
    case "noul":
      return (
        <span>
          <b className="text-neutral-900">
            {answer.noul >= answer.threshold ? "yes" : "no"}
          </b>{" "}
          · {Math.round(answer.noul * 100)}%
        </span>
      );
  }
}

function CriteriaEditor({
  items,
  onChange,
  keyPlaceholder,
  addLabel,
  ordered,
}: {
  items: Criterion[];
  onChange: (items: Criterion[]) => void;
  keyPlaceholder: string;
  addLabel: string;
  ordered?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {ordered && (
            <span className="w-3 text-right text-[10px] text-neutral-400">
              {index}
            </span>
          )}
          <TextField
            aria-label={keyPlaceholder}
            value={item.key}
            placeholder={keyPlaceholder}
            className="!w-24 shrink-0 font-mono"
            onCommit={(key) =>
              onChange(
                items.map((entry, i) =>
                  i === index ? { ...entry, key: slugify(key) } : entry
                )
              )
            }
          />
          <TextField
            aria-label="Description"
            value={item.description}
            placeholder="Description (optional)"
            onCommit={(description) =>
              onChange(
                items.map((entry, i) =>
                  i === index ? { ...entry, description } : entry
                )
              )
            }
          />
          <button
            type="button"
            aria-label="Remove"
            disabled={items.length <= 2}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="nodrag icon-button shrink-0 hover:!text-red-600 disabled:opacity-30"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...items,
            {
              key: ordered
                ? `level_${items.length}`
                : `option_${items.length + 1}`,
              description: "",
            },
          ])
        }
        className="nodrag inline-flex min-h-7 items-center gap-1 self-start rounded-md px-1.5 text-xs text-violet-700 hover:bg-violet-50"
      >
        <Plus className="size-3" /> {addLabel}
      </button>
    </div>
  );
}

function QuestionEditor({
  question,
  onChange,
  onRemove,
}: {
  question: QuestionDef;
  onChange: (question: QuestionDef) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-neutral-200/70 bg-neutral-50/80 p-2">
      <div className="flex items-center gap-1">
        <TextField
          aria-label="Question id"
          value={question.id}
          placeholder="question_id"
          className="!w-24 shrink-0 font-mono"
          onCommit={(id) =>
            onChange({ ...question, id: slugify(id) || question.id })
          }
        />
        <Select
          aria-label="Question type"
          value={question.type}
          onChange={(event) => {
            const type = event.target.value as QuestionType;

            if (type === question.type) {
              return;
            }

            const next = createQuestion(type, 0);
            onChange({
              ...next,
              id: question.id,
              instructions: question.instructions,
            });
          }}
        >
          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
        <button
          type="button"
          aria-label="Remove question"
          onClick={onRemove}
          className="nodrag icon-button ml-auto shrink-0 hover:!text-red-600"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      <TextArea
        aria-label="Instructions"
        rows={2}
        value={question.instructions}
        placeholder="Ask one focused question about `input`…"
        onCommit={(instructions) => onChange({ ...question, instructions })}
      />

      {question.type === "choice" && (
        <CriteriaEditor
          items={question.options}
          keyPlaceholder="option"
          addLabel="Add option"
          onChange={(options) => onChange({ ...question, options })}
        />
      )}

      {question.type === "score" && (
        <CriteriaEditor
          items={question.levels}
          keyPlaceholder="level"
          addLabel="Add level"
          ordered
          onChange={(levels) => onChange({ ...question, levels })}
        />
      )}

      {question.type === "noul" && (
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="shrink-0">
            yes if ≥{" "}
            <b className="font-mono">{question.threshold.toFixed(2)}</b>
          </span>
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.05}
            value={question.threshold}
            onChange={(event) =>
              onChange({ ...question, threshold: Number(event.target.value) })
            }
            className="nodrag nopan w-full accent-violet-600"
          />
        </label>
      )}
    </div>
  );
}

const JevNodeView = memo(({ id, data, selected }: NodeProps<JevNode>) => {
  const { updateNodeData } = useReactFlow<WorkflowNode>();
  const { results } = useRun();
  const result = results.get(id);
  const node: JevNode = { id, type: "jev", position: { x: 0, y: 0 }, data };

  const setQuestions = useCallback(
    (questions: QuestionDef[]) => updateNodeData(id, { questions }),
    [id, updateNodeData]
  );

  const addQuestion = (type: QuestionType) => {
    const used = new Set(data.questions.map((question) => question.id));
    let index = data.questions.length + 1;

    while (used.has(`question_${index}`)) {
      index++;
    }

    setQuestions([...data.questions, createQuestion(type, index)]);
  };

  return (
    <NodeFrame
      id={id}
      node={node}
      selected={selected}
      icon={<Sparkles className="size-3.5" />}
      accent="#7c3aed"
      result={result}
      hasTarget
      handles={getSourceHandles(node)}
      summary={
        data.questions.length === 0 ? (
          <p className="text-xs text-neutral-400">
            No questions yet. Click Edit to add one.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.questions.map((question) => {
              const answer = result?.answers?.[question.id];

              return (
                <li
                  key={question.id}
                  className="flex items-baseline justify-between gap-2 text-xs"
                >
                  <span className="truncate">
                    <span className="font-mono text-neutral-700">
                      {question.id}
                    </span>{" "}
                    <span className="text-neutral-400">
                      {QUESTION_TYPE_LABELS[question.type].toLowerCase()}
                    </span>
                  </span>
                  {answer ? (
                    <span className="shrink-0 text-neutral-500">
                      <AnswerBadge answer={answer} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )
      }
      editor={
        <div className="flex flex-col gap-2">
          <FieldLabel>Questions</FieldLabel>
          {data.questions.map((question, index) => (
            <QuestionEditor
              key={index}
              question={question}
              onChange={(next) =>
                setQuestions(
                  data.questions.map((entry, i) => (i === index ? next : entry))
                )
              }
              onRemove={() =>
                setQuestions(data.questions.filter((_, i) => i !== index))
              }
            />
          ))}
          <div className="flex flex-wrap gap-1">
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addQuestion(type)}
                  className="nodrag inline-flex min-h-7 items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:border-violet-400 hover:text-violet-700"
                >
                  <Plus className="size-3" /> {QUESTION_TYPE_LABELS[type]}
                </button>
              )
            )}
          </div>
        </div>
      }
    />
  );
});

/* -------------------------------------------------------------------------- */
/*                                  LLM node                                  */
/* -------------------------------------------------------------------------- */

const LlmNodeView = memo(({ id, data, selected }: NodeProps<LlmNode>) => {
  const { updateNodeData } = useReactFlow<WorkflowNode>();
  const { results } = useRun();
  const result = results.get(id);
  const node: LlmNode = { id, type: "llm", position: { x: 0, y: 0 }, data };
  const modelLabel =
    LLM_MODELS.find((model) => model.id === data.model)?.label ?? data.model;

  return (
    <NodeFrame
      id={id}
      node={node}
      selected={selected}
      icon={<Bot className="size-3.5" />}
      accent="#0ea5e9"
      result={result}
      hasTarget
      handles={getSourceHandles(node)}
      summary={
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-neutral-500">
            <span className="font-medium text-neutral-700">{modelLabel}</span>
            {result?.mock ? " · mock" : ""}
          </p>
          {result?.output !== undefined && result.status !== "skipped" ? (
            <p className="max-h-24 overflow-hidden whitespace-pre-wrap rounded bg-neutral-50 px-2 py-1 text-xs leading-relaxed text-neutral-700">
              {truncate(result.output, 220)}
              {result.status === "running" ? (
                <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-violet-500 align-middle" />
              ) : null}
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-neutral-500">
              {truncate(data.prompt || "Empty prompt (node is skipped).", 140)}
            </p>
          )}
        </div>
      }
      editor={
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <FieldLabel>Model</FieldLabel>
            <Select
              value={data.model}
              onChange={(event) =>
                updateNodeData(id, { model: event.target.value })
              }
            >
              {!LLM_MODELS.some((model) => model.id === data.model) ? (
                <option value={data.model}>{data.model}</option>
              ) : null}
              {LLM_MODEL_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>System</FieldLabel>
            <TextArea
              rows={2}
              value={data.system}
              placeholder="You are a helpful support agent…"
              onCommit={(system) => updateNodeData(id, { system })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Prompt</FieldLabel>
            <TextArea
              rows={5}
              value={data.prompt}
              placeholder="{{input}}"
              onCommit={(prompt) => updateNodeData(id, { prompt })}
            />
          </label>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            Use <code>{"{{input}}"}</code>, <code>{"{{answers.<id>}}"}</code>,{" "}
            <code>{"{{answers.<id>.probability}}"}</code> and{" "}
            <code>{"{{answers.<id>.confidence}}"}</code>. When several nodes
            connect in, <code>{"{{input}}"}</code> is their texts joined —
            useful for combining drafts before the output node.
          </p>
        </div>
      }
    />
  );
});

/* -------------------------------------------------------------------------- */
/*                                 Output node                                */
/* -------------------------------------------------------------------------- */

function OutputPropertyEditor({
  property,
  properties,
  onRename,
  onRemove,
}: {
  property: OutputProperty;
  properties: OutputProperty[];
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(property.name);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  useEffect(() => setDraft(property.name), [property.name]);

  function commit(value: string) {
    const name = value.trim();
    if (
      !name ||
      properties.some(
        (entry) => entry.id !== property.id && entry.name === name
      )
    ) {
      setError(
        name ? "This property already exists." : "Enter a property name."
      );
      setDraft(property.name);
      return;
    }
    setError(null);
    setDraft(name);
    if (name !== property.name) onRename(name);
  }

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        id={property.id}
        className="workflow-handle"
        style={{ left: -10, top: 14 }}
        aria-label={`${property.name} input`}
      />
      <div className="flex items-center gap-1">
        <input
          aria-label={`Property name: ${property.name}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onBlur={(event) => commit(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              setDraft(property.name);
              event.currentTarget.value = property.name;
              event.currentTarget.blur();
            }
          }}
          spellCheck={false}
          className="workflow-field nodrag nopan min-w-0 w-full rounded-md border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-neutral-900 focus:border-violet-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onRemove}
          className="icon-button nodrag shrink-0 hover:!text-red-600"
          aria-label={`Remove ${property.name}`}
          title="Remove property"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-[10px] text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const OutputNodeView = memo(({ id, data, selected }: NodeProps<OutputNode>) => {
  const { updateNodeData, setEdges } = useReactFlow<
    WorkflowNode,
    WorkflowEdge
  >();
  const { results } = useRun();
  const updateNodeInternals = useUpdateNodeInternals();
  const result = results.get(id);
  const node: OutputNode = {
    id,
    type: "output",
    position: { x: 0, y: 0 },
    data,
  };
  const outputs = getRunOutput(result?.outputs);
  const properties = getOutputProperties(data);
  const propertyKey = properties.map((property) => property.id).join("|");

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, propertyKey, result, updateNodeInternals]);

  function setProperties(next: OutputProperty[]) {
    updateNodeData(id, { properties: next });
  }

  function removeProperty(property: OutputProperty) {
    setEdges((edges) =>
      edges.filter(
        (edge) =>
          edge.target !== id ||
          getOutputPropertyId(edge.targetHandle) !== property.id
      )
    );
    setProperties(properties.filter((entry) => entry.id !== property.id));
  }

  const inputs = (
    <div className="flex flex-col gap-2">
      {properties.length === 0 ? (
        <p className="text-[11px] text-neutral-400">
          Click Edit to add an output property.
        </p>
      ) : null}
      {properties.map((property) => {
        const texts = Object.hasOwn(outputs, property.name)
          ? outputs[property.name]
          : [];
        return (
          <div key={property.id} className="relative min-h-9">
            <Handle
              type="target"
              position={Position.Left}
              id={property.id}
              className="workflow-handle"
              style={{ left: -10, top: 8 }}
              title={property.name}
              aria-label={`${property.name} input`}
            />
            <span className="block text-[11px] font-medium text-neutral-700">
              {property.name}
            </span>
            {texts.length > 0 ? (
              <div className="mt-1 flex flex-col gap-1">
                {texts.map((text, index) => (
                  <p
                    key={index}
                    className="max-h-24 overflow-hidden whitespace-pre-wrap rounded bg-neutral-50 px-2 py-1 text-xs leading-relaxed text-neutral-700"
                  >
                    {truncate(text, 220)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-neutral-400">
                {result?.status === "complete"
                  ? "No message"
                  : "Connect a message"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <NodeFrame
      id={id}
      node={node}
      selected={selected}
      icon={<FileOutput className="size-3.5" />}
      accent="#059669"
      result={result}
      hasTarget={false}
      handles={getSourceHandles(node)}
      summary={inputs}
      editor={
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Properties</FieldLabel>
          {properties.map((property) => (
            <OutputPropertyEditor
              key={property.id}
              property={property}
              properties={properties}
              onRename={(name) =>
                setProperties(
                  properties.map((entry) =>
                    entry.id === property.id ? { ...entry, name } : entry
                  )
                )
              }
              onRemove={() => removeProperty(property)}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              setProperties([...properties, createOutputProperty(properties)])
            }
            className="nodrag flex min-h-7 items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 px-2 py-1 text-[11px] text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
          >
            <Plus className="size-3" /> Add property
          </button>
        </div>
      }
    />
  );
});

export const nodeTypes: NodeTypes = {
  input: InputNodeView,
  jev: JevNodeView,
  llm: LlmNodeView,
  output: OutputNodeView,
};

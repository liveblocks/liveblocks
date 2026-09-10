"use client";

import clsx from "clsx";
import { CheckIcon, ChevronDownIcon, CpuIcon } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type ModelOption = {
  id: string;
  displayName: string;
  description?: string;
};

type ModelsResponse = {
  models?: ModelOption[];
  defaultModelId: string;
  error?: string;
};

let modelsPromise$: Promise<ModelsResponse> | null = null;

/** Fetches the model catalog once per page load and shares it. */
export function useModels() {
  const [state, setState] = useState<ModelsResponse | null>(null);

  useEffect(() => {
    modelsPromise$ ??= fetch("/api/models")
      .then(async (response) => (await response.json()) as ModelsResponse)
      .catch((error: unknown) => ({
        defaultModelId: "composer-2.5",
        error: error instanceof Error ? error.message : "Failed to load models",
      }));

    let cancelled = false;
    void modelsPromise$.then((response) => {
      if (!cancelled) {
        setState(response);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

const EMPTY_OPTIONS: ModelOption[] = [];

export function ModelSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}) {
  const models = useModels();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef(0);
  const wasOpenRef = useRef(false);

  const options = models?.models ?? EMPTY_OPTIONS;
  const current = options.find((model) => model.id === value);
  const label = current?.displayName ?? value;

  highlightedRef.current = highlighted;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const selectedIndex = options.findIndex((model) => model.id === value);
      setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    }
    wasOpenRef.current = open;
  }, [open, options, value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (options.length === 0) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((index) => Math.min(options.length - 1, index + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((index) => Math.max(0, index - 1));
      } else if (event.key === "Home") {
        event.preventDefault();
        setHighlighted(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setHighlighted(options.length - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const model = options[highlightedRef.current];
        if (model) {
          onChange(model.id);
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onChange, open, options]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={models?.error ? models.error : "Model"}
        className={clsx(
          "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-panel-hover hover:text-foreground disabled:cursor-default disabled:hover:bg-transparent",
          open && "bg-panel-hover text-foreground"
        )}
      >
        <CpuIcon className="size-3.5" />
        <span className="max-w-40 truncate">{label}</span>
        <ChevronDownIcon className="size-3 text-subtle" />
      </button>

      {open ? (
        <div
          ref={listRef}
          role="listbox"
          className="absolute bottom-[calc(100%+6px)] left-0 z-50 max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-xl"
        >
          <div className="px-3 pb-1 pt-1.5 text-[11px] font-medium text-subtle">
            Model
          </div>
          {models === null ? (
            <div className="px-3 py-2 text-xs text-muted">Loading models…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted">
              {models.error ?? "No models available"}
            </div>
          ) : (
            options.map((model, index) => {
              const selected = model.id === value;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-start gap-2 px-3 py-1.5 text-left transition",
                    index === highlighted && "bg-panel-hover",
                    selected && index !== highlighted && "bg-panel"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {model.displayName}
                    </span>
                    {model.description ? (
                      <span className="block truncate text-[11px] text-muted">
                        {model.description}
                      </span>
                    ) : (
                      <span className="block truncate font-mono text-[11px] text-subtle">
                        {model.id}
                      </span>
                    )}
                  </span>
                  {selected ? (
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import clsx from "clsx";
import {
  CheckIcon,
  ChevronDownIcon,
  GitCommitHorizontalIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Repo } from "@/lib/repo";
import type { BranchesResponse } from "@/lib/types";

const branchesCache = new Map<string, Promise<BranchesResponse>>();

function fetchBranches(repoUrl: string): Promise<BranchesResponse> {
  let branchesPromise$ = branchesCache.get(repoUrl);
  if (!branchesPromise$) {
    branchesPromise$ = fetch(
      `/api/branches?repo=${encodeURIComponent(repoUrl)}`
    )
      .then(async (response) => {
        // Shape is defined by /api/branches?repo=
        const body = (await response.json()) as BranchesResponse;
        return response.ok
          ? body
          : { branches: [], error: "Couldn't load branches" };
      })
      .catch(() => ({ branches: [], error: "Couldn't load branches" }));
    branchesCache.set(repoUrl, branchesPromise$);
  }
  return branchesPromise$;
}

/** Default branch from the cached branches fetch for a repository. */
export function useDefaultBranch(repoUrl: string | null): string | null {
  const [defaultBranch, setDefaultBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!repoUrl) {
      setDefaultBranch(null);
      return;
    }
    let cancelled = false;
    void fetchBranches(repoUrl).then((response) => {
      if (!cancelled) {
        setDefaultBranch(response.defaultBranch ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repoUrl]);

  return defaultBranch;
}

function useBranches(repoUrl: string | null) {
  const [data, setData] = useState<BranchesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    if (!repoUrl) {
      return;
    }
    void fetchBranches(repoUrl).then((response) => {
      if (!cancelled) {
        setData(response);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repoUrl]);

  return data;
}

type BranchOption =
  | { type: "use-query"; name: string }
  | { type: "branch"; name: string };

export function BranchSelect({
  repo,
  onChange,
  disabled,
}: {
  repo: Repo;
  onChange?: (ref: string) => void;
  disabled?: boolean;
}) {
  const editable = onChange !== undefined;
  // Existing chats only display the branch; no need to list them
  const branches = useBranches(editable ? repo.url : null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightedRef = useRef(0);
  const wasOpenRef = useRef(false);

  highlightedRef.current = highlighted;

  const filteredBranches = useMemo(() => {
    const all = branches?.branches ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return all;
    }
    return all.filter((name) => name.toLowerCase().includes(needle));
  }, [branches, query]);

  const options = useMemo(() => {
    const result: BranchOption[] = [];
    const trimmed = query.trim();

    if (
      trimmed !== "" &&
      !(branches?.branches ?? []).some((name) => name === trimmed)
    ) {
      result.push({ type: "use-query", name: trimmed });
    }

    for (const name of filteredBranches) {
      result.push({ type: "branch", name });
    }

    return result;
  }, [branches, filteredBranches, query]);

  const commitOption = (option: BranchOption) => {
    if (!onChange) {
      return;
    }
    const ref = option.type === "use-query" ? option.name : option.name;
    onChange(ref);
    setQuery("");
    setOpen(false);
  };

  const commitQuery = () => {
    const trimmed = query.trim();
    const highlightedOption = options[highlightedRef.current];
    if (highlightedOption) {
      commitOption(highlightedOption);
      return;
    }
    if (trimmed !== "" && onChange) {
      onChange(trimmed);
      setQuery("");
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setHighlighted(0);
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    setHighlighted(0);
  }, [options.length, query]);

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
        setQuery("");
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const handleListKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (options.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        commitQuery();
      }
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
      commitQuery();
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const triggerClassName =
    "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted transition hover:bg-panel-hover hover:text-foreground disabled:cursor-default disabled:hover:bg-transparent";

  if (!editable) {
    return (
      <span
        className={clsx(
          triggerClassName,
          "cursor-default hover:bg-transparent"
        )}
        title="Branch"
      >
        <GitCommitHorizontalIcon className="size-3.5" />
        <span className="max-w-32 truncate font-mono">{repo.ref}</span>
      </span>
    );
  }

  const showError =
    branches !== null &&
    branches.error !== undefined &&
    branches.branches.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Branch"
        className={clsx(
          triggerClassName,
          open && "bg-panel-hover text-foreground"
        )}
      >
        <GitCommitHorizontalIcon className="size-3.5" />
        <span className="max-w-32 truncate font-mono">{repo.ref}</span>
        <ChevronDownIcon className="size-3 text-subtle" />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-64 rounded-lg border border-border bg-background py-1 shadow-xl">
          <div className="px-3 pb-1 pt-1.5 text-[11px] font-medium text-subtle">
            Branch
          </div>
          <div className="px-3 pb-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              spellCheck={false}
              placeholder="Search or type a branch"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleListKeyDown}
              className="w-full rounded-md border border-border bg-panel px-2 py-1 font-mono text-xs outline-none focus:border-subtle"
            />
          </div>
          <div
            ref={listRef}
            role="listbox"
            className="max-h-80 overflow-y-auto"
          >
            {branches === null ? (
              <div className="px-3 py-2 text-xs text-muted">
                Loading branches…
              </div>
            ) : (
              <>
                {showError ? (
                  <div className="px-3 py-2 text-xs text-muted">
                    {branches.error}
                  </div>
                ) : null}
                {options.map((option, index) => {
                  if (option.type === "use-query") {
                    return (
                      <button
                        key={`use-${option.name}`}
                        type="button"
                        role="option"
                        aria-selected={false}
                        data-index={index}
                        onMouseEnter={() => setHighlighted(index)}
                        onClick={() => commitOption(option)}
                        className={clsx(
                          "flex w-full items-start gap-2 px-3 py-1.5 text-left transition",
                          index === highlighted && "bg-panel-hover"
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium">
                          Use &ldquo;{option.name}&rdquo;
                        </span>
                      </button>
                    );
                  }

                  const selected = option.name === repo.ref;
                  return (
                    <button
                      key={option.name}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-index={index}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => commitOption(option)}
                      className={clsx(
                        "flex w-full items-start gap-2 px-3 py-1.5 text-left transition",
                        index === highlighted && "bg-panel-hover",
                        selected && index !== highlighted && "bg-panel"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium">
                        {option.name}
                      </span>
                      {selected ? (
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
                      ) : null}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

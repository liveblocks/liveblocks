"use client";

import clsx from "clsx";
import {
  CheckIcon,
  ChevronDownIcon,
  FileTextIcon,
  GitBranchIcon,
  LockIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  DEFAULT_REF,
  getRepoName,
  isValidRepoUrl,
  LOCKED_REPO,
  normalizeRepoUrl,
  type Repo,
} from "@/lib/repo";
import type { ReposResponse } from "@/lib/types";

let reposCache: ReposResponse | null = null;

/** Repositories connected to Cursor, fetched once per page load. */
export function useRepos(): ReposResponse | null {
  const [data, setData] = useState<ReposResponse | null>(reposCache);

  useEffect(() => {
    if (reposCache) {
      return;
    }
    let cancelled = false;
    fetch("/api/repos")
      .then(async (response) => {
        // Shape is defined by /api/repos
        const body = (await response.json()) as ReposResponse;
        return response.ok ? body : { repos: [], error: "Could not load" };
      })
      .catch(() => ({ repos: [], error: "Could not load repositories" }))
      .then((body) => {
        reposCache = body;
        if (!cancelled) {
          setData(body);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

type RepoOption =
  | { type: "use-url"; url: string; label: string }
  | { type: "none" }
  | { type: "repo"; url: string };

export function RepoSelect({
  value,
  onChange,
  disabled,
}: {
  value: Repo | null;
  onChange?: (repo: Repo | null) => void;
  disabled?: boolean;
}) {
  const repos = useRepos();
  const editable = onChange !== undefined && LOCKED_REPO === null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightedRef = useRef(0);
  const wasOpenRef = useRef(false);

  const label = value ? getRepoName(value.url) : "No repository";
  const locked = LOCKED_REPO !== null;

  highlightedRef.current = highlighted;

  const filteredRepos = useMemo(() => {
    const all = repos?.repos ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return all;
    }
    return all.filter((url) => url.toLowerCase().includes(needle));
  }, [query, repos]);

  const options = useMemo(() => {
    const result: RepoOption[] = [];
    const trimmed = query.trim();

    if (isValidRepoUrl(trimmed)) {
      const normalized = normalizeRepoUrl(trimmed);
      if (normalized && !(repos?.repos ?? []).includes(normalized)) {
        result.push({
          type: "use-url",
          url: normalized,
          label: getRepoName(normalized),
        });
      }
    }

    result.push({ type: "none" });

    for (const url of filteredRepos) {
      result.push({ type: "repo", url });
    }

    return result;
  }, [filteredRepos, query, repos]);

  const commitOption = (option: RepoOption) => {
    if (!onChange) {
      return;
    }
    if (option.type === "none") {
      onChange(null);
    } else if (option.type === "use-url") {
      onChange({ url: option.url, ref: DEFAULT_REF });
    } else {
      onChange({
        url: option.url,
        ref: value?.url === option.url ? value.ref : DEFAULT_REF,
      });
    }
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
    if (isValidRepoUrl(trimmed)) {
      const normalized = normalizeRepoUrl(trimmed);
      if (normalized && onChange) {
        onChange({ url: normalized, ref: DEFAULT_REF });
        setQuery("");
        setOpen(false);
      }
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
    "flex h-7 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-muted";

  const showEmptyRepos =
    repos !== null &&
    repos.repos.length === 0 &&
    !options.some((option) => option.type === "use-url");
  const showNoMatches =
    repos !== null &&
    filteredRepos.length === 0 &&
    query.trim() !== "" &&
    !options.some((option) => option.type === "use-url");

  if (!editable) {
    return (
      <span
        className={clsx(triggerClassName, "cursor-default")}
        title={
          locked ? "Repository is locked for this deployment" : "Repository"
        }
      >
        <GitBranchIcon className="size-3.5" />
        <span className="max-w-40 truncate">{label}</span>
        {locked ? <LockIcon className="size-3 text-subtle" /> : null}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Repository"
        className={clsx(
          triggerClassName,
          "transition hover:bg-panel-hover hover:text-foreground disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted",
          open && "bg-panel-hover text-foreground"
        )}
      >
        <GitBranchIcon className="size-3.5" />
        <span className="max-w-40 truncate">{label}</span>
        <ChevronDownIcon className="size-3 text-subtle" />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-80 rounded-lg border border-border bg-background py-1 shadow-xl">
          <div className="px-3 pb-1 pt-1.5 text-[11px] font-medium text-subtle">
            Repository
          </div>
          <div className="px-3 pb-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              spellCheck={false}
              placeholder="Search, or paste a GitHub URL"
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
            {repos === null ? (
              <div className="px-3 py-2 text-xs text-muted">
                Loading repositories from Cursor…
              </div>
            ) : (
              <>
                {showEmptyRepos ? (
                  <div className="px-3 py-2 text-xs text-muted">
                    {repos.error ??
                      "No repositories are connected to Cursor yet. Grant the Cursor GitHub App access, or paste a URL."}
                  </div>
                ) : null}
                {showNoMatches ? (
                  <div className="px-3 py-2 text-xs text-muted">
                    No matches. Paste a full GitHub URL to use it.
                  </div>
                ) : null}
                {options.map((option, index) => {
                  if (option.type === "use-url") {
                    return (
                      <button
                        key={`use-${option.url}`}
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
                          Use {option.label}
                        </span>
                      </button>
                    );
                  }

                  if (option.type === "none") {
                    const selected = value === null;
                    return (
                      <button
                        key="none"
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
                        <FileTextIcon className="mt-0.5 size-4 shrink-0 text-subtle" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            No repository
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            Chat and write documents without code changes
                          </span>
                        </span>
                        {selected ? (
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" />
                        ) : null}
                      </button>
                    );
                  }

                  const selected = option.url === value?.url;
                  return (
                    <button
                      key={option.url}
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
                        {getRepoName(option.url)}
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

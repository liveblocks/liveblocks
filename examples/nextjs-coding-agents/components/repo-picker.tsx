"use client";

import clsx from "clsx";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  GitBranchIcon,
  Loader2Icon,
  LockIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getRepoName,
  isValidRepoUrl,
  LOCKED_REPO,
  normalizeRepoUrl,
  type Repo,
} from "@/lib/repo";
import type { ReposResponse } from "@/lib/types";

let reposCache: ReposResponse | null = null;

/** Repositories connected to Cursor, fetched once per page load. */
export function useRepos() {
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

/**
 * Picks the repository and base branch for a new chat. The list comes from
 * Cursor (what its GitHub App can reach); any other GitHub URL can still be
 * typed in, though the agent will fail if it has no access to it.
 */
export function RepoPicker({
  value,
  onChange,
}: {
  value: Repo;
  onChange: (repo: Repo) => void;
}) {
  const repos = useRepos();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value.url);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(() => {
    const all = repos?.repos ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle || needle === value.url.toLowerCase()) {
      return all;
    }
    return all.filter((url) => url.toLowerCase().includes(needle));
  }, [query, repos, value.url]);

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
        setQuery(value.url);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, value.url]);

  useEffect(() => {
    setHighlighted(0);
  }, [options.length, query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const commit = (url: string) => {
    const normalized = normalizeRepoUrl(url) ?? url;
    onChange({ ...value, url: normalized });
    setQuery(normalized);
    setOpen(false);
  };

  if (LOCKED_REPO) {
    return (
      <div className="mb-3 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5 text-xs">
          <GitBranchIcon className="size-3.5 shrink-0 text-subtle" />
          <span className="min-w-0 flex-1 truncate font-mono">
            {getRepoName(LOCKED_REPO.url)}
            <span className="text-subtle"> · {LOCKED_REPO.ref}</span>
          </span>
          <span
            className="flex shrink-0 items-center gap-1 text-subtle"
            title="Every chat in this deployment works on this repository (NEXT_PUBLIC_LOCKED_REPO)."
          >
            <LockIcon className="size-3" />
            Locked
          </span>
        </div>
      </div>
    );
  }

  const invalid = query.trim() !== "" && !isValidRepoUrl(query);

  return (
    <div className="mb-3 flex items-start gap-2">
      <div ref={containerRef} className="relative min-w-0 flex-1">
        <label
          className={clsx(
            "flex items-center gap-2 rounded-lg border bg-panel px-3 py-1.5 text-xs transition focus-within:border-subtle",
            invalid && !open ? "border-danger/50" : "border-border"
          )}
        >
          <span className="shrink-0 text-subtle">Repository</span>
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="repo-options"
            aria-autocomplete="list"
            value={query}
            spellCheck={false}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setHighlighted((index) =>
                  Math.min(options.length - 1, index + 1)
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlighted((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                commit(
                  open && options[highlighted] ? options[highlighted] : query
                );
              } else if (event.key === "Escape") {
                setOpen(false);
                setQuery(value.url);
              }
            }}
            onBlur={() => {
              // Keep whatever was typed if it's a valid URL
              if (isValidRepoUrl(query)) {
                commit(query);
              }
            }}
            placeholder="https://github.com/owner/repo"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-subtle"
          />
          {repos === null ? (
            <Loader2Icon className="size-3 shrink-0 animate-spin text-subtle" />
          ) : (
            <ChevronsUpDownIcon className="size-3 shrink-0 text-subtle" />
          )}
        </label>

        {open ? (
          <ul
            id="repo-options"
            ref={listRef}
            role="listbox"
            className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-xl"
          >
            {repos === null ? (
              <li className="px-3 py-2 text-xs text-muted">
                Loading repositories from Cursor…
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">
                {repos.error
                  ? repos.error
                  : repos.repos.length === 0
                    ? "No repositories are connected to Cursor yet. Grant the Cursor GitHub App access, or paste a URL."
                    : "No matches. Press Enter to use the URL as typed."}
              </li>
            ) : (
              options.map((url, index) => {
                const selected = url === value.url;
                return (
                  <li
                    key={url}
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    onMouseEnter={() => setHighlighted(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      commit(url);
                    }}
                    className={clsx(
                      "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs",
                      index === highlighted && "bg-panel-hover"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {getRepoName(url)}
                    </span>
                    {selected ? (
                      <CheckIcon className="size-3.5 shrink-0 text-accent" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      <label className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5 text-xs">
        <span className="text-subtle">Branch</span>
        <input
          type="text"
          value={value.ref}
          spellCheck={false}
          onChange={(event) => onChange({ ...value, ref: event.target.value })}
          className="w-20 bg-transparent font-mono text-xs text-foreground outline-none"
        />
      </label>
    </div>
  );
}

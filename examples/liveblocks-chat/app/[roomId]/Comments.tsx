"use client";

import { useThreads } from "@liveblocks/react/suspense";
import { Thread, Composer } from "@liveblocks/react-ui";

export function Comments() {
  const { threads } = useThreads();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-stone-100 px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">
          Thread
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {threads.length === 0 ? (
          <p className="px-1 text-center text-sm text-stone-400">
            No messages yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-md border border-stone-100 bg-stone-50/50"
              >
                {thread.metadata?.source === "slack" && (
                  <div className="border-b border-stone-100/80 px-3 py-2">
                    <span className="text-[11px] font-medium text-stone-500">
                      Slack
                      {thread.metadata.channelName
                        ? ` · #${thread.metadata.channelName}`
                        : ""}
                    </span>
                  </div>
                )}
                <div className="[&_.lb-root]:text-[13px]">
                  <Thread thread={thread} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-stone-100 bg-white p-3">
        <Composer
          className="lb-composer-minimal rounded-md border border-stone-200 shadow-none"
          collapsed={false}
        />
      </div>
    </div>
  );
}

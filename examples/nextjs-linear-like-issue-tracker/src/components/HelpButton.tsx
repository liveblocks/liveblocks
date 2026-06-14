"use client";

import { ReactNode, useEffect, useState } from "react";
import { HelpIcon } from "@/icons/HelpIcon";
import { CreateIcon } from "@/icons/CreateIcon";
import { CommentIcon } from "@/icons/CommentIcon";
import { InboxIcon } from "@/icons/InboxIcon";
import { ProgressInProgressIcon } from "@/icons/ProgressInProgressIcon";
import { SparklesIcon } from "@/icons/SparklesIcon";

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: <CommentIcon className="w-4 h-4" />,
    title: "Real-time collaboration",
    description:
      "Edit an issue's title and rich-text description together. Live cursors and avatars show who else is viewing or editing.",
  },
  {
    icon: <ProgressInProgressIcon className="w-4 h-4" />,
    title: "Edit issue properties in real-time",
    description:
      "Change priority, progress, labels, and assignees. Updates sync instantly for everyone.",
  },
  {
    icon: <InboxIcon className="w-4 h-4" />,
    title: "Comments & threads",
    description:
      "Leave comments, reply in threads, and @mention teammates. Mentions appear in the Inbox in the left nav.",
  },
  {
    icon: <SparklesIcon className="w-4 h-4" />,
    title: "AI Assistant",
    description:
      "@mention the “AI Assistant” in a comment to get a streamed reply. It can create new issues and edit the current one. The sparkle buttons also auto-fill properties, labels, and links.",
  },
  {
    icon: <CreateIcon className="w-4 h-4" />,
    title: "Create issues",
    description: "Use the + button in the top-left nav to create a new issue.",
  },
];

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="How to use this example"
        className="fixed bottom-4 left-4 z-50 flex items-center justify-center w-9 h-9 bg-white rounded-full shadow-sm border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
      >
        <HelpIcon className="w-5 h-5" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/20"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-neutral-200 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-200">
              <div>
                <h2
                  id="help-modal-title"
                  className="text-sm font-semibold text-neutral-900"
                >
                  <a
                    href="https://liveblocks.io/examples/linear-like-issue-tracker/nextjs-linear-like-issue-tracker"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    Linear-like issue tracker
                  </a>
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  How to use this example
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="shrink-0 -mt-1 -mr-1 p-1.5 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <ul className="p-5 flex flex-col gap-4">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-start gap-4">
                  <span className="shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 rounded bg-neutral-100 text-neutral-700">
                    {feature.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
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

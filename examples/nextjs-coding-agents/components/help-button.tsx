"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EXAMPLE_NAME = "Coding Agents";
const EXAMPLE_URL =
  "https://liveblocks.io/examples/coding-agents/nextjs-coding-agents";

type Feature = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: <SparklesIcon />,
    title: "A coding agent in every chat",
    description:
      "Each chat is a Liveblocks feed backed by a Cursor cloud agent. Ask for a change and watch it read files, run commands, and open a pull request.",
  },
  {
    icon: <UsersIcon />,
    title: "Talk to it together",
    description:
      "Open this example in two tabs and pick different users from the dropdown. Messages sent while the agent is busy are queued, then handled in one combined reply.",
  },
  {
    icon: <HashIcon />,
    title: "Skills and mentions",
    description:
      "Type / to pick a reusable skill like Fix bug or Write tests, and @ to mention teammates. Pick a model per chat from the dropdown.",
  },
  {
    icon: <PenIcon />,
    title: "Notifications",
    description:
      "When the agent finishes, everyone who took part in the chat gets a notification in the bell.",
  },
];

const styles: Record<string, CSSProperties> = {
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    background: "transparent",
    border: "none",
    borderRadius: 99999,
    color: "#737373",
    cursor: "pointer",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "rgba(23, 23, 23, 0.2)",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e5e5e5",
    borderRadius: 8,
    boxShadow:
      "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    width: "100%",
    maxWidth: 448,
    maxHeight: "80vh",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: 20,
    borderBottom: "1px solid #e5e5e5",
  },
  title: { fontSize: 14, fontWeight: 600, color: "#171717", margin: 0 },
  titleLink: { color: "inherit", textDecoration: "none" },
  desc: { fontSize: 14, color: "#737373", marginTop: 4, marginBottom: 0 },
  close: {
    flexShrink: 0,
    marginTop: -4,
    marginRight: -4,
    padding: 6,
    borderRadius: 4,
    border: "none",
    background: "transparent",
    color: "#737373",
    cursor: "pointer",
    lineHeight: 0,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  item: { display: "flex", alignItems: "flex-start", gap: 16 },
  iconWrap: {
    flexShrink: 0,
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 4,
    background: "#f5f5f5",
    color: "#404040",
  },
  featureTitle: { fontSize: 14, fontWeight: 500, color: "#171717", margin: 0 },
  featureDesc: {
    fontSize: 14,
    color: "#737373",
    marginTop: 2,
    marginBottom: 0,
  },
};

const HOVER_CSS = `
.lb-help-button:hover { background:#f5f5f5 !important; color:#171717 !important; }
.lb-help-title-link:hover { text-decoration: underline !important; }
.lb-help-close:hover { background:#f5f5f5 !important; color:#171717 !important; }
.lb-help, .lb-help * { box-sizing: border-box; }
`;

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <style>{HOVER_CSS}</style>
      <button
        type="button"
        className="lb-help-button"
        style={styles.button}
        onClick={() => setIsOpen(true)}
        aria-label="How to use this example"
      >
        <HelpIcon />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              style={styles.backdrop}
              role="dialog"
              aria-modal="true"
              aria-labelledby="lb-help-title"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="lb-help"
                style={styles.panel}
                onClick={(event) => event.stopPropagation()}
              >
                <div style={styles.header}>
                  <div>
                    <h2 id="lb-help-title" style={styles.title}>
                      <a
                        className="lb-help-title-link"
                        style={styles.titleLink}
                        href={EXAMPLE_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {EXAMPLE_NAME}
                      </a>
                    </h2>
                    <p style={styles.desc}>How to use this example</p>
                  </div>
                  <button
                    type="button"
                    className="lb-help-close"
                    style={styles.close}
                    aria-label="Close"
                    onClick={() => setIsOpen(false)}
                  >
                    <CloseIcon />
                  </button>
                </div>

                <ul style={styles.list}>
                  {FEATURES.map((feature) => (
                    <li key={feature.title} style={styles.item}>
                      <span style={styles.iconWrap}>{feature.icon}</span>
                      <div>
                        <h3 style={styles.featureTitle}>{feature.title}</h3>
                        <p style={styles.featureDesc}>{feature.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function HelpIcon() {
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
      <circle cx={12} cy={12} r={10} />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
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

function FeatureIconBase({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

function HashIcon() {
  return (
    <FeatureIconBase>
      <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
    </FeatureIconBase>
  );
}

function SparklesIcon() {
  return (
    <FeatureIconBase>
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
      <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </FeatureIconBase>
  );
}

function UsersIcon() {
  return (
    <FeatureIconBase>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx={9} cy={7} r={4} />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </FeatureIconBase>
  );
}

function PenIcon() {
  return (
    <FeatureIconBase>
      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
    </FeatureIconBase>
  );
}

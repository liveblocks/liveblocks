"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EXAMPLE_NAME = "Collaborative Text Editor (LiveText primitive)";

const EXAMPLE_URL =
  "https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-livetext-custom";

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: <TypeIcon />,
    title: "LiveText",
    description:
      "Type anywhere in the editor—every keystroke becomes a LiveText operation and syncs to everyone in real-time.",
  },
  {
    icon: <BoldIcon />,
    title: "Inline formatting",
    description:
      "Select some text and use the toolbar, or ⌘B, ⌘I, and ⌘⇧X, to toggle bold, italic, and strikethrough.",
  },
  {
    icon: <MergeIcon />,
    title: "Conflict resolution",
    description:
      "Simultaneous edits are merged with operational transformation, so every client converges on the same text.",
  },
  {
    icon: <UndoIcon />,
    title: "Undo & redo",
    description:
      "⌘Z and ⌘⇧Z step through your own edit history, even while others keep editing around you.",
  },
  {
    icon: <CodeIcon />,
    title: "No editor framework",
    description:
      "Built on a plain contenteditable—the DOM is always rendered straight from Liveblocks Storage.",
  },
];

const styles: Record<string, CSSProperties> = {
  button: {
    position: "fixed",
    bottom: 16,
    left: 16,
    zIndex: 2147483000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    background: "#ffffff",
    border: "1px solid #e5e5e5",
    borderRadius: 9999,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
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
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "#171717",
    margin: 0,
  },
  titleLink: {
    color: "inherit",
    textDecoration: "none",
  },
  desc: {
    fontSize: 14,
    color: "#737373",
    marginTop: 4,
    marginBottom: 0,
  },
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
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
  },
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
  featureTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#171717",
    margin: 0,
  },
  featureDesc: {
    fontSize: 14,
    color: "#737373",
    marginTop: 2,
    marginBottom: 0,
  },
};

const HOVER_CSS = `
.lb-help-button:hover { background:#fafafa !important; color:#171717 !important; }
.lb-help-title-link:hover { text-decoration: underline !important; }
.lb-help-close:hover { background:#f5f5f5 !important; color:#171717 !important; }
.lb-help, .lb-help * { box-sizing: border-box; }
.lb-help h2 { font-size: 14px !important; font-weight: 600 !important; line-height: 1.4 !important; margin: 0 !important; }
.lb-help h2 a { font-size: inherit !important; font-weight: inherit !important; }
.lb-help h3 { font-size: 14px !important; font-weight: 500 !important; line-height: 1.4 !important; margin: 0 !important; }
.lb-help p { font-size: 14px !important; line-height: 1.45 !important; }
.lb-help ul { list-style: none !important; }
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
        aria-label="How to use this example"
        onClick={() => setIsOpen(true)}
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

function TypeIcon() {
  return (
    <FeatureIconBase>
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </FeatureIconBase>
  );
}

function BoldIcon() {
  return (
    <FeatureIconBase>
      <path d="M6 12h9a4 4 0 010 8H7a1 1 0 01-1-1V5a1 1 0 011-1h7a4 4 0 010 8" />
    </FeatureIconBase>
  );
}

function MergeIcon() {
  return (
    <FeatureIconBase>
      <circle cx={18} cy={18} r={3} />
      <circle cx={6} cy={6} r={3} />
      <path d="M6 21V9a9 9 0 009 9" />
    </FeatureIconBase>
  );
}

function UndoIcon() {
  return (
    <FeatureIconBase>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </FeatureIconBase>
  );
}

function CodeIcon() {
  return (
    <FeatureIconBase>
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
    </FeatureIconBase>
  );
}

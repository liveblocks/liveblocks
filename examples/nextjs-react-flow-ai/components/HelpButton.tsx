"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ControlButton } from "@xyflow/react";
import { Icon } from "@liveblocks/react-ui";

const EXAMPLE_NAME = "Collaborative Flowchart AI";

const EXAMPLE_URL =
  "https://liveblocks.io/examples/collaborative-flowchart-ai/nextjs-react-flow-ai";

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: <SparklesIcon />,
    title: "AI diagram agent",
    description:
      "Ask the AI to create or edit the flowchart, and watch it update in real-time for everyone in the room.",
  },
  {
    icon: <EditIcon />,
    title: "Build and connect blocks",
    description:
      "Place blocks, connect them with arrows, edit labels, and undo or redo your changes.",
  },
  {
    icon: <UsersIcon />,
    title: "Real-time presence",
    description:
      "See who else is editing with live cursors and an avatar stack as you collaborate.",
  },
  {
    icon: <CommentIcon />,
    title: "Pinned comments with AI",
    description:
      "Drop pinned comments on the canvas and @mention the AI Assistant to make changes and reply in threads.",
  },
];

const styles: Record<string, CSSProperties> = {
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
.lb-help-title-link:hover { text-decoration: underline !important; }
.lb-help-close:hover { background:#f5f5f5 !important; color:#171717 !important; }
.lb-help, .lb-help * { box-sizing: border-box; }
.lb-help h2 { font-size: 14px !important; font-weight: 600 !important; line-height: 1.4 !important; margin: 0 !important; }
.lb-help h2 a { font-size: inherit !important; font-weight: inherit !important; }
.lb-help h3 { font-size: 14px !important; font-weight: 500 !important; line-height: 1.4 !important; margin: 0 !important; }
.lb-help p { font-size: 14px !important; line-height: 1.45 !important; }
.lb-help ul { list-style: none !important; }
`;

export function HelpControl() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ControlButton
        className="lb-help-control"
        onClick={() => setIsOpen(true)}
        aria-label="How to use this example"
      >
        <Icon.QuestionMark />
      </ControlButton>
      <HelpDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

function HelpDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      style={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lb-help-title"
      onClick={onClose}
    >
      <style>{HOVER_CSS}</style>
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
            onClick={onClose}
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
    document.body,
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

function CommentIcon() {
  return (
    <FeatureIconBase>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
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

function EditIcon() {
  return (
    <FeatureIconBase>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" />
    </FeatureIconBase>
  );
}

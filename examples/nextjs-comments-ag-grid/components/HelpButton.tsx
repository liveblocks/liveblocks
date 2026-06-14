"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EXAMPLE_NAME = "AG Grid Comments";

const EXAMPLE_URL =
  "https://liveblocks.io/examples/ag-grid-comments/nextjs-comments-ag-grid";

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: <CommentIcon />,
    title: "Comment on any cell",
    description:
      "Hover over a grid cell and click the pin to start a comment thread on that value.",
  },
  {
    icon: <PinIcon />,
    title: "Threads pinned to cells",
    description:
      "Each thread stays attached to its row and column, shown as a pin in the cell.",
  },
  {
    icon: <AtIcon />,
    title: "Mention teammates",
    description:
      "Type @ in a comment to mention and notify other people on your team.",
  },
  {
    icon: <UsersIcon />,
    title: "Real-time collaboration",
    description:
      "New comments and replies from others appear live as everyone works in the grid.",
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
            document.body,
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

function PinIcon() {
  return (
    <FeatureIconBase>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V16a1 1 0 001 1h12a1 1 0 001-1v-.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V7a1 1 0 011-1 2 2 0 000-4H8a2 2 0 000 4 1 1 0 011 1z" />
    </FeatureIconBase>
  );
}

function CommentIcon() {
  return (
    <FeatureIconBase>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </FeatureIconBase>
  );
}

function AtIcon() {
  return (
    <FeatureIconBase>
      <circle cx={12} cy={12} r={4} />
      <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
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

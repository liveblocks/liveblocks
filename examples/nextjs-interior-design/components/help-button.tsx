"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EXAMPLE_NAME = "Collaborative interior design";
const EXAMPLE_URL =
  "https://liveblocks.io/examples/interior-design/nextjs-interior-design";

type Feature = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: <FloorPlanIcon />,
    title: "Draw the floor plan",
    description:
      "Pick the Room tool and drag to draw a room. Drag walls and corners to reshape it, and use the + handles to add corners.",
  },
  {
    icon: <DoorIcon />,
    title: "Add doors, windows, and furniture",
    description:
      "Use the Door and Window tools to place openings on any wall, then drag furniture from the library onto the plan. Furniture snaps flush against walls.",
  },
  {
    icon: <UsersIcon />,
    title: "Design together",
    description:
      "Open this example in two tabs: every change syncs instantly through Liveblocks Storage, with live cursors and selections from Presence.",
  },
  {
    icon: <UndoIcon />,
    title: "Multiplayer undo and redo",
    description:
      "Each person undoes only their own changes. A whole drag counts as a single step, so nothing is lost when you work at the same time.",
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
    borderRadius: 6,
    color: "#6a7282",
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
    background: "rgba(16, 24, 40, 0.2)",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
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
    borderBottom: "1px solid #e5e7eb",
  },
  title: { fontSize: 14, fontWeight: 600, color: "#101828", margin: 0 },
  titleLink: { color: "inherit", textDecoration: "none" },
  desc: { fontSize: 14, color: "#6a7282", marginTop: 4, marginBottom: 0 },
  close: {
    flexShrink: 0,
    marginTop: -4,
    marginRight: -4,
    padding: 6,
    borderRadius: 4,
    border: "none",
    background: "transparent",
    color: "#6a7282",
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
    background: "#f3f4f6",
    color: "#4a5565",
  },
  featureTitle: { fontSize: 14, fontWeight: 500, color: "#101828", margin: 0 },
  featureDesc: {
    fontSize: 14,
    color: "#6a7282",
    marginTop: 2,
    marginBottom: 0,
  },
};

const HOVER_CSS = `
.lb-help-button:hover { background:#f9fafb !important; color:#101828 !important; }
.lb-help-title-link:hover { text-decoration: underline !important; }
.lb-help-close:hover { background:#f3f4f6 !important; color:#101828 !important; }
.lb-help-link { color:#4a5565 !important; text-decoration: underline !important; }
.lb-help-link:hover { color:#101828 !important; }
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

function FloorPlanIcon() {
  return (
    <FeatureIconBase>
      <path d="M3 3h18v18H3z" />
      <path d="M12 3v7M12 14v7M12 10H3" />
    </FeatureIconBase>
  );
}

function DoorIcon() {
  return (
    <FeatureIconBase>
      <path d="M4 20V4M4 4h12" />
      <path d="M16 4a12 12 0 01-12 12" strokeDasharray="2 3" />
      <path d="M4 20h16" />
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

function UndoIcon() {
  return (
    <FeatureIconBase>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 010 11H11" />
    </FeatureIconBase>
  );
}

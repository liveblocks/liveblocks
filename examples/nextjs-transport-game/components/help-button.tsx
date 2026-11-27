"use client";

import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";

const EXAMPLE_NAME = "Transport Game";
const EXAMPLE_URL =
  "https://liveblocks.io/examples/transport-game/nextjs-transport-game";

type Feature = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: <RouteIcon />,
    title: "Build a network",
    description:
      "Pick the road or rail tool and drag across the map to lay track, then place stations next to towns and industries. Docks go on the water by the shore, and ships need no track at all. Anything you build can be undone with Ctrl+Z.",
  },
  {
    icon: <TruckIcon />,
    title: "Run vehicles",
    description:
      "With the vehicle tool, click two of your stations to buy a bus, truck, train or ship that carries passengers and cargo between them. Click an industry, or open the Cargo window, to see what needs to go where.",
  },
  {
    icon: <UsersIcon />,
    title: "Play together",
    description:
      "Open this example in two tabs and pick a different company in each. Every build, vehicle and cursor shows up live.",
  },
  {
    icon: <GlobeIcon />,
    title: "Shared world",
    description:
      "Tracks are shared, so you can connect to another company's network. Towns grow on their own, from cottages to skyscrapers, and faster with stations nearby: click a town's name to see how it's doing.",
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
.lb-help-button:hover { background:#fafafa !important; color:#171717 !important; }
.lb-help-title-link:hover { text-decoration: underline !important; }
.lb-help-close:hover { background:#f5f5f5 !important; color:#171717 !important; }
.lb-help-link { color:#404040 !important; text-decoration: underline !important; }
.lb-help-link:hover { color:#171717 !important; }
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
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen(true)}
        aria-label="How to use this example"
      >
        <HelpIcon />
      </Button>

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

function RouteIcon() {
  return (
    <FeatureIconBase>
      <circle cx={6} cy={19} r={3} />
      <path d="M9 19h8.5a3.5 3.5 0 100-7h-11a3.5 3.5 0 010-7H15" />
      <circle cx={18} cy={5} r={3} />
    </FeatureIconBase>
  );
}

function TruckIcon() {
  return (
    <FeatureIconBase>
      <path d="M14 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a1 1 0 001 1h2" />
      <path d="M15 18h2" />
      <path d="M19 18h2v-3.34a1 1 0 00-.76-.97L18 13H15" />
      <circle cx={17} cy={18} r={2} />
      <circle cx={7} cy={18} r={2} />
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

function GlobeIcon() {
  return (
    <FeatureIconBase>
      <circle cx={12} cy={12} r={10} />
      <path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" />
      <path d="M2 12h20" />
    </FeatureIconBase>
  );
}
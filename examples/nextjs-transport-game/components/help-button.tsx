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
      "The Build window has a menu for railways, one for roads and one for waterways, and each stays open until you close it. Drag across the map to lay track, then place stations next to towns and industries. Drag a train station for a platform as long as your trains, and drag along it again to make it longer. Docks go on the water by the shore, and ships need no track at all: dig a canal to bring them inland.",
  },
  {
    icon: <TruckIcon />,
    title: "Run vehicles",
    description:
      "Vehicles are bought at a depot: build a garage, an engine shed or a shipyard next to your road, railway or water, click it, choose one of its vehicles (and for a train, how many carriages), then click the two stations it should run between. A station takes everything around it, so one vehicle can carry passengers and freight together. Click an industry, or open the Cargo window, to see what needs to go where. Click a vehicle to watch it, follow it or sell it. Press X to see through buildings when a station is hard to find.",
  },
  {
    icon: <SignalIcon />,
    title: "Keep them apart",
    description:
      "Vehicles can't drive through each other. Buses and trucks queue, and a canal has room for one ship at a time. Trains that meet on the same track crash, and both are lost: lay two tracks, one for each way, and put signals beside them. A block signal lets a train through when the track behind it is empty, a path signal when the train's own way to the next signal is free, and a one-way path signal can't be passed from behind. Only the carriages that fit beside a platform load and unload.",
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
      "Roads are shared, so your buses and trucks can drive on another company's. Towns grow along a grid of streets, from cottages to skyscrapers, but only while vehicles call at their stations, and industries make more once enough of their output is carried away. The game can be paused or fast-forwarded, for everyone at once. The Stats window has graphs of how every company is doing, and the Theme window changes the look of the map and of the windows, for you alone. Your company window starts a new map: a mainland or an island, in the snow, the desert or the jungle.",
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

function SignalIcon() {
  return (
    <FeatureIconBase>
      <rect x={8} y={2} width={8} height={14} rx={2} />
      <circle cx={12} cy={6.5} r={1} />
      <circle cx={12} cy={11.5} r={1} />
      <path d="M12 16v6" />
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
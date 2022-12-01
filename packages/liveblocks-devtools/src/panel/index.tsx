import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";

import { EmptyState } from "./components/EmptyState";
import { ReloadButton } from "./components/ReloadButton";
import { ResizablePanel } from "./components/ResizablePanel";
import { RoomSelector } from "./components/RoomSelector";
import { RoomStatus } from "./components/RoomStatus";
import { StorageSearch } from "./components/StorageSearch";
import { Tabs } from "./components/Tabs";
import { CurrentRoomProvider, useCurrentRoomId } from "./contexts/CurrentRoom";
import { ThemeProvider } from "./contexts/Theme";
import { Presence } from "./tabs/presence";
import { Storage } from "./tabs/storage";

function Panel() {
  const [search, setSearch] = useState("");
  const currentRoomId = useCurrentRoomId();

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value),
    []
  );

  const handleSearchClear = useCallback(() => {
    setSearch("");
  }, []);

  const handleReload = useCallback(() => {
    browser.tabs.reload();
  }, []);

  useEffect(() => {
    handleSearchClear();
  }, [currentRoomId, handleSearchClear]);

  if (currentRoomId === null) {
    return (
      <EmptyState
        visual={
          <svg
            width="128"
            height="128"
            viewBox="0 0 128 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-light-500 dark:text-dark-500"
          >
            <g>
              <g transform="translate(-22.5,-16)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0 0H45L12.9496 32V13.44L0 0Z"
                  fill="currentColor"
                />
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path="M54.5 61C54.5 61 77 32 87 42C97 52 73.5 67 73.5 67"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.6 0 0.4 1"
                />
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 22.5 16"
                  to="180 22.5 16"
                  dur="2s"
                  repeatCount="indefinite"
                  fill="freeze"
                  additive="sum"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.8 0 0.2 1"
                />
              </g>
              <g transform="translate(-22.5,-16)">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M45 32H0L32.0504 0V18.56L45 32Z"
                  fill="currentColor"
                />
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path="M73.5 67C73.5 67 51 96 41 86C31 76 54.5 61 54.5 61"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.6 0 0.4 1"
                />
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 22.5 16"
                  to="180 22.5 16"
                  dur="2s"
                  repeatCount="indefinite"
                  fill="freeze"
                  additive="sum"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.8 0 0.2 1"
                />
              </g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 64 64"
                to="180 64 64"
                dur="2s"
                repeatCount="indefinite"
                fill="freeze"
                additive="sum"
                calcMode="spline"
                keyTimes="0;1"
                keySplines="0.8 0 0.2 1"
              />
            </g>
          </svg>
        }
        title={<>No Liveblocks&nbsp;rooms found.</>}
        description={
          <>
            Try reloading the page if something is wrong or go to the docs to
            get started with&nbsp;Liveblocks.
          </>
        }
        actions={[
          { title: "Reload", onClick: handleReload },
          { title: "Get started", href: "https://liveblocks.io/docs" },
        ]}
      />
    );
  }

  return (
    <ResizablePanel
      content={
        <Tabs
          className="h-full"
          defaultValue="presence"
          tabs={[
            {
              value: "presence",
              title: "Presence",
              content: <Presence />,
            },
            {
              value: "history",
              title: "History",
              content: null,
              disabled: true,
            },
            {
              value: "events",
              title: "Events",
              content: null,
              disabled: true,
            },
          ]}
        />
      }
    >
      <Tabs
        className="h-full"
        defaultValue="storage"
        tabs={[
          {
            value: "storage",
            title: "Storage",
            content: (
              <Storage
                key={currentRoomId}
                search={search}
                onSearchClear={handleSearchClear}
              />
            ),
          },
          {
            value: "settings",
            title: "Settings",
            content: null,
            disabled: true,
          },
        ]}
        leading={
          <div className="after:bg-light-300 after:dark:bg-dark-300 relative flex flex-none items-center pl-1.5 pr-1 after:absolute after:-right-px after:top-[20%] after:h-[60%] after:w-px">
            <ReloadButton onClick={handleReload} />
            <RoomStatus />
            <RoomSelector />
          </div>
        }
        trailing={
          <div className="after:bg-light-300 after:dark:bg-dark-300 relative w-[30%] min-w-[140px] flex-none after:absolute after:-left-px after:top-[20%] after:h-[60%] after:w-px">
            <StorageSearch value={search} onChange={handleSearchChange} />
          </div>
        }
      />
    </ResizablePanel>
  );
}

function PanelApp() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <CurrentRoomProvider>
          <Panel />
        </CurrentRoomProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<PanelApp />);

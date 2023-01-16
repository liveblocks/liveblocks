import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";

import { Loading } from "../components/Loading";
import { ThemeProvider } from "../contexts/Theme";
import { EmptyState } from "./components/EmptyState";
import { ReloadButton } from "./components/ReloadButton";
import { ResizablePanel } from "./components/ResizablePanel";
import { RoomSelector } from "./components/RoomSelector";
import { RoomStatus } from "./components/RoomStatus";
import { StorageSearch } from "./components/StorageSearch";
import { Tabs } from "./components/Tabs";
import { CurrentRoomProvider, useCurrentRoomId } from "./contexts/CurrentRoom";
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
        visual={<Loading />}
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
      className="child:select-none select-none"
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
          <div className="after:bg-light-300 after:dark:bg-dark-300 relative flex max-w-[40%] flex-none items-center pl-1.5 pr-1 after:absolute after:-right-px after:top-[20%] after:h-[60%] after:w-px">
            <ReloadButton onClick={handleReload} className="flex-none" />
            <RoomStatus className="flex-none" />
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
    <ThemeProvider devtools>
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

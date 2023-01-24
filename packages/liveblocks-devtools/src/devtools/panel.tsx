import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";

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
import { sendMessage } from "./port";
import { Presence } from "./tabs/presence";
import { Storage } from "./tabs/storage";

function buildRegex(searchText: string): RegExp {
  // Interpret the search string as a regular expression if the search string
  // starts and ends with "/".
  if (
    searchText.startsWith("/") &&
    searchText.endsWith("/") &&
    searchText.length >= 3
  ) {
    try {
      return new RegExp(searchText.substring(1, searchText.length - 1), "i");
    } catch {
      // Fall through, interpret the invalid regex as a literal string match
      // instead
    }
  }

  // Still build a regex to use internally, but simply build one that will
  // match the input literally
  return new RegExp(searchText.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
}

function Panel() {
  const [searchText, setSearchText] = useState("");
  const search = useMemo(() => {
    const trimmed = (searchText ?? "").trim();
    return trimmed ? buildRegex(trimmed) : undefined;
  }, [searchText]);

  const currentRoomId = useCurrentRoomId();

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value),
    []
  );

  const handleSearchClear = useCallback(() => {
    setSearchText("");
  }, []);

  const handleReload = useCallback(() => {
    sendMessage({ msg: "reload" });
  }, []);

  useEffect(() => {
    handleSearchClear();
  }, [currentRoomId, handleSearchClear]);

  if (currentRoomId === null) {
    return (
      <div className="absolute inset-0 flex h-full select-none flex-col text-center">
        <EmptyState
          className="relative flex-1"
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
        <div className="bg-light-0 dark:bg-dark-0 border-light-300 dark:border-dark-300 flex h-12 w-full flex-none items-center justify-center border-t px-8">
          <p className="text-dark-900 dark:text-dark-800 text-2xs truncate leading-normal">
            Requires a <strong className="font-medium">development</strong>{" "}
            build of{" "}
            <span className="relative inline-block px-[0.35em] py-[0.1em] before:absolute before:inset-0 before:rounded-[0.4em] before:bg-current before:opacity-10">
              @liveblocks/client
            </span>{" "}
            0.19.4 or newer.
          </p>
        </div>
      </div>
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
                searchText={searchText}
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
            <StorageSearch value={searchText} onChange={handleSearchChange} />
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

import { useStorage } from "@plasmohq/storage/hook";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { Loading } from "../components/Loading";
import { ThemeProvider } from "../contexts/Theme";
import { buildSearchRegex } from "../lib/buildSearchRegex";
import { EmptyState } from "./components/EmptyState";
import { Ping } from "./components/Ping";
import { ReloadButton } from "./components/ReloadButton";
import { ResizablePanel } from "./components/ResizablePanel";
import { RoomSelector } from "./components/RoomSelector";
import { RoomStatus } from "./components/RoomStatus";
import { Search } from "./components/Search";
import type { Tab } from "./components/Tabs";
import { Tabs } from "./components/Tabs";
import {
  CurrentRoomProvider,
  useCurrentRoomId,
  useCustomEventCount,
} from "./contexts/CurrentRoom";
import { sendMessage } from "./port";
import { EventTimeline } from "./tabs/event-timeline";
import { Presence } from "./tabs/presence";
import { Storage } from "./tabs/storage";
import type { YjsChangesView, YjsTab } from "./tabs/yjs";
import { Yjs, YJS_CHANGES_VIEWS, YJS_TABS } from "./tabs/yjs";

const MAIN_TABS = ["storage", "yjs"] as const;
const SECONDARY_TABS = ["presence", "events"] as const;

type MainTab = (typeof MAIN_TABS)[number];
type SecondaryTab = (typeof SECONDARY_TABS)[number];

function Panel() {
  const [mainTab, setMainTab] = useStorage<MainTab>("tabs-main", MAIN_TABS[0]);
  const [secondaryTab, setSecondaryTab] = useStorage<SecondaryTab>(
    "tabs-secondary",
    SECONDARY_TABS[0]
  );
  const [yjsTab, setYjsTab] = useStorage<YjsTab>("tabs-main-yjs", YJS_TABS[0]);
  const [yjsChangesView, setYjsChangesView] = useStorage<YjsChangesView>(
    "yjs-changes-view",
    YJS_CHANGES_VIEWS[0]
  );
  const currentRoomId = useCurrentRoomId();
  const [searchText, setSearchText] = useState("");
  const search = useMemo(() => {
    const trimmed = (searchText ?? "").trim();
    return trimmed ? buildSearchRegex(trimmed) : undefined;
  }, [searchText]);
  const isSearchActive = useMemo(() => {
    return (
      mainTab === "storage" || (mainTab === "yjs" && yjsTab === "document")
    );
  }, [mainTab, yjsTab]);

  const handleSearchClear = useCallback(() => {
    setSearchText("");
  }, []);

  const handleReload = useCallback(() => {
    sendMessage({ msg: "reload" });
  }, []);

  const handleMainTabChange = useCallback(
    (value: string) => {
      void setMainTab(value as MainTab);
    },
    [setMainTab]
  );

  const handleSecondaryTabChange = useCallback(
    (value: string) => {
      void setSecondaryTab(value as SecondaryTab);
    },
    [setSecondaryTab]
  );

  const handleYjsTabChange = useCallback(
    (value: string) => {
      void setYjsTab(value as YjsTab);
    },
    [setYjsTab]
  );

  const handleYjsChangesViewChange = useCallback(
    (value: string) => {
      void setYjsChangesView(value as YjsChangesView);
    },
    [setYjsChangesView]
  );

  const mainTabs: Tab[] = useMemo(() => {
    return MAIN_TABS.map((tab) => {
      switch (tab) {
        case "storage":
          return {
            value: "storage",
            title: "Storage",
            content: (
              <Storage
                key={`${currentRoomId}:storage`}
                search={search}
                searchText={searchText}
                onSearchClear={handleSearchClear}
              />
            ),
          };
        case "yjs":
          return {
            value: "yjs",
            title: "Yjs",
            content: (
              <Yjs
                key={`${currentRoomId}:yjs`}
                activeTab={yjsTab}
                setActiveTab={handleYjsTabChange}
                search={search}
                searchText={searchText}
                onSearchClear={handleSearchClear}
                changesView={yjsChangesView}
                setChangesView={handleYjsChangesViewChange}
              />
            ),
          };
      }
    });
  }, [
    currentRoomId,
    handleSearchClear,
    handleYjsChangesViewChange,
    handleYjsTabChange,
    search,
    searchText,
    yjsChangesView,
    yjsTab,
  ]);

  const numCustomEvents = useCustomEventCount();

  const secondaryTabs: Tab[] = useMemo(() => {
    if (!currentRoomId) {
      return [] as Tab[];
    }

    return SECONDARY_TABS.map((tab) => {
      switch (tab) {
        case "presence":
          return {
            value: "presence",
            title: "Presence",
            content: <Presence key={`${currentRoomId}:presence`} />,
          };
        case "events":
          return {
            value: "events",
            title: "Events",
            richTitle: (
              <span className="flex items-center">
                Events
                {numCustomEvents > 0 && (
                  <Ping
                    className="text-blue-500 dark:text-blue-400 ml-1.5"
                    animate={false}
                  />
                )}
              </span>
            ),
            content: <EventTimeline key={`${currentRoomId}:event-timeline`} />,
          };
      }
    });
  }, [currentRoomId, numCustomEvents]);

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
            {
              title: "Get started",
              href: "https://liveblocks.io/docs/guides/devtools",
            },
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
      panel={
        <Tabs
          className="h-full"
          value={secondaryTab}
          onValueChange={handleSecondaryTabChange}
          tabs={secondaryTabs}
        />
      }
    >
      <Tabs
        className="h-full"
        value={mainTab}
        onValueChange={handleMainTabChange}
        tabs={mainTabs}
        leading={
          <div className="after:bg-light-300 after:dark:bg-dark-300 relative flex max-w-[40%] flex-none items-center pl-1.5 pr-1 after:absolute after:-right-px after:top-[20%] after:h-[60%] after:w-px">
            <ReloadButton onClick={handleReload} className="flex-none" />
            <RoomStatus className="flex-none" />
            <RoomSelector />
          </div>
        }
        trailing={
          <div className="ml-auto after:bg-light-300 after:dark:bg-dark-300 relative w-[35%] min-w-[140px] flex-none after:absolute after:-left-px after:top-[20%] after:h-[60%] after:w-px">
            <Search
              value={searchText}
              setValue={setSearchText}
              disabled={!isSearchActive}
            />
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

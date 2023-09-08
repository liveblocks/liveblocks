import "reactflow/dist/style.css";

import type { DevTools } from "@liveblocks/core";
import cx from "classnames";
import {
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useEdgesState, useNodesState } from "reactflow";
import * as Y from "yjs";

import { Loading } from "../../../components/Loading";
import { buildSearchRegex } from "../../../lib/buildSearchRegex";
import { getNodesAndEdges, yDocToJsonTree } from "../../../lib/ydoc";
import { EmptyState } from "../../components/EmptyState";
import { Search } from "../../components/Search";
import { Tabs } from "../../components/Tabs";
import { StorageTree } from "../../components/Tree";
import { useMe, useStatus, useYdoc } from "../../contexts/CurrentRoom";
import YFlow from "./yflow/YFlow";
import { YUpdateLog } from "./YUpdateLog";

interface YjsContentProps extends ComponentProps<"div"> {
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}

function YjsContentTree({
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: YjsContentProps) {
  const [jsonData, setJsonData] = useState<DevTools.JsonTreeNode[]>([]);
  const ydoc = useYdoc();
  const currentStatus = useStatus();

  useEffect(() => {
    function onUpdate() {
      const yjson = yDocToJsonTree(ydoc);

      setJsonData(yjson);
    }

    onUpdate();
    ydoc.on("update", onUpdate);

    return () => {
      ydoc.off("update", onUpdate);
    };
  }, [ydoc]);

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    return (
      <div className={cx(className, "absolute inset-0")} {...props}>
        <StorageTree data={jsonData} search={search} />
      </div>
    );
  }

  return <EmptyState visual={<Loading />} />;
}

function YjsContentChanges({ className, ...props }: ComponentProps<"div">) {
  const currentStatus = useStatus();

  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    return (
      <div className={cx(className, "absolute inset-0 overflow-y-auto")} {...props}>
        <YUpdateLog />
      </div>
    );
  }

  return <EmptyState visual={<Loading />} />;
}

export function Yjs({ className, ...props }: ComponentProps<"div">) {
  const [activeTab, setActiveTab] = useState("tree");
  const [searchText, setSearchText] = useState("");
  const search = useMemo(() => {
    const trimmed = (searchText ?? "").trim();
    return trimmed ? buildSearchRegex(trimmed) : undefined;
  }, [searchText]);
  const isSearchVisible = useMemo(() => activeTab === "tree", [activeTab]);

  const handleSearchClear = useCallback(() => {
    setSearchText("");
  }, []);

  return (
    <div className={cx(className, "absolute inset-0 flex flex-col")} {...props}>
      <Tabs
        className="h-full"
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={[
          {
            value: "tree",
            title: "Tree",
            content: (
              <YjsContentTree
                search={search}
                searchText={searchText}
                onSearchClear={handleSearchClear}
              />
            ),
          },
          {
            value: "changes",
            title: "Changes",
            content: <YjsContentChanges />,
          },
        ]}
        trailing={
          isSearchVisible ? (
            <div className="ml-auto after:bg-light-300 after:dark:bg-dark-300 relative w-[30%] min-w-[140px] flex-none after:absolute after:-left-px after:top-[20%] after:h-[60%] after:w-px">
              <Search
                value={searchText}
                setValue={setSearchText}
                placeholder="Search document…"
              />
            </div>
          ) : null
        }
      />
    </div>
  );
}

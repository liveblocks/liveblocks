
import * as Popover from "@radix-ui/react-popover";
import { Suspense, useState } from "react";
import Loading from "./loading";
import { VersionHistoryList, Version } from "@liveblocks/react-ui";
import { useVersions } from "@liveblocks/react";
import type { HistoryVersion } from "@liveblocks/core";
import { VersionPreview } from "@liveblocks/react-lexical";


export default function VersionsPopover() {
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [version, setVersion] = useState<HistoryVersion>();
  const { versions, isLoading } = useVersions();
  return (
    <Popover.Root open={versionsOpen} onOpenChange={setVersionsOpen}>
      <Popover.Trigger className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8">

        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M 12 2 C 6.4889971 2 2 6.4889971 2 12 C 2 17.511003 6.4889971 22 12 22 C 17.511003 22 22 17.511003 22 12 C 22 6.4889971 17.511003 2 12 2 z M 12 4 C 16.430123 4 20 7.5698774 20 12 C 20 16.430123 16.430123 20 12 20 C 7.5698774 20 4 16.430123 4 12 C 4 7.5698774 7.5698774 4 12 4 z M 11 6 L 11 12.414062 L 15.292969 16.707031 L 16.707031 15.292969 L 13 11.585938 L 13 6 L 11 6 z"></path>
        </svg>

      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          style={{ width: "90vw", height: "90vh" }}
          className="rounded-xl border border-border bg-card text-card-foreground shadow text-sm overflow-hidden w-full z-20 flex"
        >
          <Suspense fallback={<Loading />}>
            <div className="grow p-4">
              {version && <VersionPreview version={version} />}
            </div>
            <div className="text-sm relative w-[250px] h-full overflow-auto border-l border-border/80 min-w-[250px]">
              {isLoading ? <Loading /> :
                <VersionHistoryList>
                  {versions?.map((version) => (
                    <Version
                      onClick={() => { setVersion(version) }}
                      key={version.id}
                      version={version}
                    />
                  ))}
                </VersionHistoryList>
              }
            </div>

          </Suspense>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}


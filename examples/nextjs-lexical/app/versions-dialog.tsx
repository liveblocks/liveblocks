import * as Dialog from "@radix-ui/react-dialog";
import { Suspense, useCallback, useState } from "react";
import Loading from "./loading";
import { VersionSummaryList, VersionSummary } from "@liveblocks/react-ui";
import type { Version } from "@liveblocks/core";
import { VersionPreview } from "@liveblocks/react-lexical";
import { useVersions } from "@liveblocks/react/suspense";

export default function VersionsDialog() {
  const [isOpen, setOpen] = useState(false);

  const onVersionRestore = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          width="16"
          height="16"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M 12 2 C 6.4889971 2 2 6.4889971 2 12 C 2 17.511003 6.4889971 22 12 22 C 17.511003 22 22 17.511003 22 12 C 22 6.4889971 17.511003 2 12 2 z M 12 4 C 16.430123 4 20 7.5698774 20 12 C 20 16.430123 16.430123 20 12 20 C 7.5698774 20 4 16.430123 4 12 C 4 7.5698774 7.5698774 4 12 4 z M 11 6 L 11 12.414062 L 15.292969 16.707031 L 16.707031 15.292969 L 13 11.585938 L 13 6 L 11 6 z"
          />
        </svg>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 fixed inset-0 cursor-pointer" />
        <Dialog.Content className="rounded-xl border border-border bg-card text-card-foreground shadow text-sm overflow-hidden fixed top-[50%] left-[50%] h-[85vh] w-[90vw] translate-x-[-50%] translate-y-[-50%] outline-none z-20">
          <Dialog.Title className="sr-only">Versions</Dialog.Title>
          <Dialog.Description className="sr-only">
            Previous versions of this document
          </Dialog.Description>
          <Suspense fallback={<Loading />}>
            <Versions onVersionRestore={onVersionRestore} />
          </Suspense>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Versions({ onVersionRestore }: { onVersionRestore: () => void }) {
  const [selectedVersion, setSelectedVersion] = useState<Version>();
  const { versions } = useVersions();

  return versions.length === 0 ? (
    <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
      No versions yet
    </div>
  ) : (
    <div className="flex h-full">
      <div className="flex-1 h-full min-w-0">
        {selectedVersion ? (
          <VersionPreview
            version={selectedVersion}
            className="w-full h-full"
            onVersionRestore={onVersionRestore}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
            No version selected
          </div>
        )}
      </div>
      <div className="text-sm relative w-[250px] h-full overflow-auto border-l border-border/80">
        <VersionSummaryList>
          {versions.map((version) => (
            <VersionSummary
              onClick={() => {
                setSelectedVersion(version);
              }}
              key={version.id}
              version={version}
              selected={version.id === selectedVersion?.id}
            />
          ))}
        </VersionSummaryList>
      </div>
    </div>
  );
}

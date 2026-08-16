"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  useDeleteHistoryVersion,
  useHistoryVersions,
  useHistoryVersionStorageData,
  useRestoreToStorageVersion,
} from "@liveblocks/react";
import {
  HistoryVersionSummary,
  HistoryVersionSummaryList,
} from "@liveblocks/react-ui";
import type { HistoryVersion } from "@liveblocks/client";
import {
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
  type EdgeTypes,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  FLOWCHART_EDGE_TYPE,
  FLOWCHART_STORAGE_KEY,
  blockSourceHandleId,
  blockTargetHandleId,
  getBlockColor,
  getBlockShape,
  type BlockColor,
  type BlockHandleSide,
  type FlowchartEdge,
  type FlowchartNode,
} from "./shared";

function getBlockStyle(color: BlockColor | undefined): CSSProperties {
  return {
    "--flowchart-block-color": getBlockColor(color),
  } as CSSProperties;
}

const HANDLE_POSITIONS = [
  [Position.Top, "top"],
  [Position.Right, "right"],
  [Position.Bottom, "bottom"],
  [Position.Left, "left"],
] as const satisfies ReadonlyArray<readonly [Position, BlockHandleSide]>;

const PreviewBlockNode = memo(({ data }: NodeProps<FlowchartNode>) => {
  return (
    <>
      <div
        className="flowchart-block"
        style={getBlockStyle(data.color)}
        data-shape={getBlockShape(data.shape)}
      >
        <div className="flowchart-block-label flowchart-version-preview-label">
          {data.label || "Add text"}
        </div>
      </div>

      {HANDLE_POSITIONS.map(([position, side]) => (
        <Fragment key={side}>
          <Handle
            type="target"
            position={position}
            id={blockTargetHandleId(side)}
            className="flowchart-handle"
            isConnectable={false}
          />
          <Handle
            type="source"
            position={position}
            id={blockSourceHandleId(side)}
            className="flowchart-handle"
            isConnectable={false}
          />
        </Fragment>
      ))}
    </>
  );
});

const PreviewLabelEdge = memo(
  ({
    data,
    markerEnd,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    style,
  }: EdgeProps<FlowchartEdge>) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0,
    });
    const label = data?.label?.trim();

    return (
      <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        {label ? (
          <EdgeLabelRenderer>
            <div
              className="flowchart-edge-label-container"
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              }}
            >
              <span className="flowchart-edge-label-readonly" title={label}>
                {label}
              </span>
            </div>
          </EdgeLabelRenderer>
        ) : null}
      </>
    );
  }
);

const previewNodeTypes: NodeTypes = {
  block: PreviewBlockNode,
};

const previewEdgeTypes: EdgeTypes = {
  [FLOWCHART_EDGE_TYPE]: PreviewLabelEdge,
};

function flowFromStorageData(data: { toJSON: () => unknown }): {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
} {
  const root = data.toJSON() as Record<string, unknown> | null | undefined;
  const flow = root?.[FLOWCHART_STORAGE_KEY] as
    | {
        nodes?: Record<string, FlowchartNode>;
        edges?: Record<string, FlowchartEdge>;
      }
    | undefined;

  const nodes = Object.values(flow?.nodes ?? {}).map((node) => ({
    ...node,
    selected: false,
    dragging: false,
  }));

  const edges = Object.values(flow?.edges ?? {}).map((edge) => ({
    ...edge,
    selected: false,
    type: edge.type ?? FLOWCHART_EDGE_TYPE,
    markerEnd: edge.markerEnd ?? {
      type: MarkerType.ArrowClosed,
    },
  }));

  return { nodes, edges };
}

function FitViewOnLoad({
  nodeCount,
  edgeCount,
}: {
  nodeCount: number;
  edgeCount: number;
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 0 });
    });

    return () => cancelAnimationFrame(frame);
  }, [fitView, nodeCount, edgeCount]);

  return null;
}

function StorageVersionPreview({
  version,
  onVersionRestore,
}: {
  version: HistoryVersion;
  onVersionRestore: () => void;
}) {
  const { data, isLoading, error } = useHistoryVersionStorageData(version.id);
  const restoreToStorageVersion = useRestoreToStorageVersion(version.id);
  const deleteHistoryVersion = useDeleteHistoryVersion();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { nodes, edges } = useMemo(
    () => (data ? flowFromStorageData(data) : { nodes: [], edges: [] }),
    [data]
  );

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      await restoreToStorageVersion();
      onVersionRestore();
    } catch (restoreError) {
      console.error(restoreError);
    } finally {
      setIsRestoring(false);
    }
  }, [onVersionRestore, restoreToStorageVersion]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteHistoryVersion(version.id);
    } catch (deleteError) {
      console.error(deleteError);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteHistoryVersion, version.id]);

  return (
    <div className="lb-root lb-history-version-preview flowchart-version-preview">
      <div className="lb-history-version-preview-content flowchart-version-preview-content">
        {isLoading ? (
          <div className="flowchart-version-preview-status">
            Loading version…
          </div>
        ) : error ? (
          <div className="flowchart-version-preview-status">
            Failed to load version
          </div>
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={previewNodeTypes}
              edgeTypes={previewEdgeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnScroll
              zoomOnScroll
              preventScrolling={false}
              fitView
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                type: FLOWCHART_EDGE_TYPE,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                },
              }}
            >
              <FitViewOnLoad
                nodeCount={nodes.length}
                edgeCount={edges.length}
              />
              <Background />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>
      <div className="lb-history-version-preview-footer">
        <div className="lb-history-version-preview-actions">
          <button
            type="button"
            className="flowchart-version-preview-button flowchart-version-preview-button-primary"
            onClick={() => {
              void handleRestore();
            }}
            disabled={
              isRestoring || isDeleting || isLoading || !!error || !data
            }
          >
            {isRestoring ? "Restoring…" : "Restore"}
          </button>
          <button
            type="button"
            className="flowchart-version-preview-button flowchart-version-preview-button-danger"
            onClick={() => {
              void handleDelete();
            }}
            disabled={isDeleting || isRestoring || isLoading || !!error}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Versions({ onVersionRestore }: { onVersionRestore: () => void }) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const { versions, isLoading } = useHistoryVersions();

  useEffect(() => {
    if (!versions?.length) {
      setSelectedVersionId(undefined);
      return;
    }

    if (
      !selectedVersionId ||
      !versions.some((version) => version.id === selectedVersionId)
    ) {
      setSelectedVersionId(versions[0].id);
    }
  }, [selectedVersionId, versions]);

  const selectedVersion = useMemo(
    () => versions?.find((version) => version.id === selectedVersionId),
    [selectedVersionId, versions]
  );

  if (isLoading) {
    return (
      <div className="flowchart-version-preview-status">
        Loading version history…
      </div>
    );
  }

  if (!versions?.length) {
    return (
      <div className="flowchart-version-preview-status">No versions yet</div>
    );
  }

  return (
    <div className="flowchart-versions">
      <div className="flowchart-versions-preview">
        {selectedVersion ? (
          <StorageVersionPreview
            key={selectedVersion.id}
            version={selectedVersion}
            onVersionRestore={onVersionRestore}
          />
        ) : (
          <div className="flowchart-version-preview-status">
            No version selected
          </div>
        )}
      </div>
      <div className="flowchart-versions-list">
        <HistoryVersionSummaryList>
          {versions.map((version) => (
            <HistoryVersionSummary
              key={version.id}
              version={version}
              selected={version.id === selectedVersionId}
              onClick={() => {
                setSelectedVersionId(version.id);
              }}
            />
          ))}
        </HistoryVersionSummaryList>
      </div>
    </div>
  );
}

export function VersionsDialog() {
  const [isOpen, setOpen] = useState(false);

  const onVersionRestore = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flowchart-version-history-trigger"
          aria-label="Version history"
          title="Version history"
        >
          <ClockIcon />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="flowchart-version-history-overlay" />
        <Dialog.Content className="flowchart-version-history-dialog">
          <Dialog.Title className="sr-only">Versions</Dialog.Title>
          <Dialog.Description className="sr-only">
            Previous versions of this flowchart
          </Dialog.Description>
          <Versions onVersionRestore={onVersionRestore} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M 12 2 C 6.4889971 2 2 6.4889971 2 12 C 2 17.511003 6.4889971 22 12 22 C 17.511003 22 22 17.511003 22 12 C 22 6.4889971 17.511003 2 12 2 z M 12 4 C 16.430123 4 20 7.5698774 20 12 C 20 16.430123 16.430123 20 12 20 C 7.5698774 20 4 16.430123 4 12 C 4 7.5698774 7.5698774 4 12 4 z M 11 6 L 11 12.414062 L 15.292969 16.707031 L 16.707031 15.292969 L 13 11.585938 L 13 6 L 11 6 z"
      />
    </svg>
  );
}

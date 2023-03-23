import { ComponentProps, useMemo, useState } from "react";
import {
  DocumentType,
  Group,
  GetDocumentsProps,
  GetDocumentsResponse,
} from "../../types";
import { useSession } from "next-auth/react";
import { usePaginatedDocumentsSWR } from "../../lib/client";
import {
  DocumentCreatePopover,
  DocumentRowSkeleton,
} from "../../components/Documents";
import clsx from "clsx";
import { Container } from "../../primitives/Container";
import { PlusIcon } from "../../icons";
import { Button } from "../../primitives/Button";
import { Select } from "../../primitives/Select";
import { Spinner } from "../../primitives/Spinner";
import styles from "./Documents.module.css";
import { DocumentRowGroup } from "../../components/Documents/DocumentRowGroup";
import { capitalize } from "../../utils";

// Load `x` documents at a time
const DOCUMENT_LOAD_LIMIT = 10;

interface Props extends ComponentProps<"div"> {
  filter?: "all" | "drafts" | "group";
  group?: Group;
}

export function DocumentsLayout({
  filter = "all",
  group,
  className,
  ...props
}: Props) {
  const { data: session } = useSession();
  const [documentType, setDocumentType] = useState<DocumentType | "all">("all");

  // Return `getDocuments` params for the current filters/group
  const getDocumentsOptions: GetDocumentsProps | null = useMemo(() => {
    if (!session) {
      return null;
    }

    const currentDocumentType =
      documentType === "all" ? undefined : documentType;

    // Get the current user's drafts
    if (filter === "drafts") {
      return {
        documentType: currentDocumentType,
        userId: session.user.info.id,
        drafts: true,
        limit: DOCUMENT_LOAD_LIMIT,
      };
    }

    // Get the current group's documents
    if (filter === "group" && group?.id) {
      return {
        documentType: currentDocumentType,
        groupIds: [group.id],
        limit: DOCUMENT_LOAD_LIMIT,
      };
    }

    // Get all documents for the current user
    return {
      documentType: currentDocumentType,
      userId: session.user.info.id,
      groupIds: session.user.info.groupIds,
      limit: DOCUMENT_LOAD_LIMIT,
    };
  }, [filter, group, session, documentType]);

  // When session is found, find pages of documents with the above document options
  const {
    data,
    error,
    isValidating,
    size,
    setSize,
    mutate: revalidateDocuments,
    isLoadingInitialData,
    isLoadingMore,
    isEmpty,
    isReachingEnd,
    isRefreshing,
  } = usePaginatedDocumentsSWR(getDocumentsOptions, {
    refreshInterval: 10000,
  });

  const documentsPages: GetDocumentsResponse[] = data ?? [];

  if (!session) {
    return (
      <Container
        size="small"
        className={clsx(className, styles.documents)}
        {...props}
      >
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <p>You don’t have access to these documents.</p>
          </div>
        </div>
      </Container>
    );
  }

  const createDocumentButton = (
    <DocumentCreatePopover
      align="end"
      userId={session.user.info.id}
      groupIds={group?.id ? [group.id] : undefined}
      draft={filter === "drafts" || filter === "all"}
      sideOffset={12}
    >
      <Button icon={<PlusIcon />}>
        {group?.id ? "New document" : "New draft"}
      </Button>
    </DocumentCreatePopover>
  );

  return (
    <Container
      size="small"
      className={clsx(className, styles.documents)}
      {...props}
    >
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>
          {group?.name ?? capitalize(filter)}
        </h1>
        <div className={styles.headerActions}>
          <Select
            initialValue="all"
            items={[
              { value: "all", title: "All" },
              { value: "text", title: "Text", disabled: true },
              { value: "whiteboard", title: "Whiteboard" },
              { value: "spreadsheet", title: "Spreadsheet", disabled: true },
            ]}
            onChange={(value: "all" | DocumentType) => {
              setDocumentType(value);
              revalidateDocuments();
            }}
            className={styles.headerSelect}
          />
          {createDocumentButton}
        </div>
      </div>

      <div className={styles.container}>
        {!isLoadingInitialData ? (
          !isEmpty ? (
            <>
              {documentsPages.map((documentPage) => (
                <DocumentRowGroup
                  key={documentPage.nextPage}
                  documents={documentPage.documents}
                  revalidateDocuments={revalidateDocuments}
                />
              ))}
              {!isReachingEnd ? (
                <div className={styles.actions}>
                  <Button
                    disabled={isLoadingMore}
                    onClick={() => setSize(size + 1)}
                    icon={isLoadingMore ? <Spinner /> : null}
                  >
                    {isLoadingMore ? "Loading…" : "Show more"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>No documents yet.</p>
              {createDocumentButton}
            </div>
          )
        ) : (
          <>
            <DocumentRowSkeleton className={styles.row} />
            <DocumentRowSkeleton className={styles.row} />
            <DocumentRowSkeleton className={styles.row} />
          </>
        )}
      </div>
    </Container>
  );
}

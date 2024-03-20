"use client";

import { LiveMap } from "@liveblocks/client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DocumentHeader, DocumentHeaderSkeleton } from "@/components/Document";
import { Whiteboard } from "@/components/Whiteboard";
import { DocumentLayout } from "@/layouts/Document";
import { ErrorLayout } from "@/layouts/Error";
import { InitialDocumentProvider, updateDocumentName } from "@/lib/client";
import { RoomProvider } from "@/liveblocks.config";
import { Document, ErrorData } from "@/types";

type Props = {
  initialDocument: Document | null;
  initialError: ErrorData | null;
};

export default function WhiteboardDocumentView({
  initialDocument,
  initialError,
}: Props) {
  const { id, error: queryError } = useParams<{ id: string; error: string }>();
  const [document, setDocument] = useState<Document | null>(initialDocument);
  const [error, setError] = useState<ErrorData | null>(initialError);

  // Update document with new name
  async function updateName(name: string) {
    if (!document) {
      return;
    }

    const { data, error } = await updateDocumentName({
      documentId: document.id,
      name: name,
    });

    if (error) {
      return;
    }

    setDocument(data);
  }

  // If error object in params, retrieve it
  useEffect(() => {
    if (queryError) {
      setError(JSON.parse(decodeURIComponent(queryError as string)));
    }
  }, [queryError]);

  if (error) {
    return <ErrorLayout error={error} />;
  }

  if (!document) {
    return <DocumentLayout header={<DocumentHeaderSkeleton />} />;
  }

  return (
    <RoomProvider
      id={id as string}
      initialPresence={{ cursor: null }}
      initialStorage={{ notes: new LiveMap() }}
    >
      <InitialDocumentProvider initialDocument={document}>
        <DocumentLayout header={<DocumentHeader documentId={document.id} />}>
          <Whiteboard />
        </DocumentLayout>
      </InitialDocumentProvider>
    </RoomProvider>
  );
}

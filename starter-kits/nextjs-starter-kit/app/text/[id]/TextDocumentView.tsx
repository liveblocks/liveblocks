"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DocumentHeader, DocumentHeaderSkeleton } from "@/components/Document";
import { TextEditor } from "@/components/TextEditor";
import { DocumentLayout, DocumentProviders } from "@/layouts/Document";
import { ErrorLayout } from "@/layouts/Error";
import { useHealedUrl } from "@/lib/hooks";
import { Document, ErrorData } from "@/types";
import { getDocumentId } from "@/utils/urls";

type Props = {
  initialDocument: Document | null;
  initialError: ErrorData | null;
};

export function TextDocumentView({ initialDocument, initialError }: Props) {
  const { id, error: queryError } = useParams<{ id: string; error: string }>();
  const documentId = getDocumentId(id);
  const [error, setError] = useState<ErrorData | null>(initialError);
  useHealedUrl(initialDocument);

  // If error object in params, retrieve it
  useEffect(() => {
    if (queryError) {
      setError(JSON.parse(decodeURIComponent(queryError as string)));
    }
  }, [queryError]);

  if (error) {
    return <ErrorLayout error={error} />;
  }

  if (!initialDocument) {
    return <DocumentLayout header={<DocumentHeaderSkeleton />} />;
  }

  return (
    <DocumentProviders roomId={documentId} initialDocument={initialDocument}>
      <DocumentLayout
        header={<DocumentHeader documentId={initialDocument.id} />}
      >
        <TextEditor />
      </DocumentLayout>
    </DocumentProviders>
  );
}

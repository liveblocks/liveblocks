import { LiveMap } from "@liveblocks/client";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { Session } from "next-auth";
import { useEffect, useState } from "react";
import {
  DocumentHeader,
  DocumentHeaderSkeleton,
} from "../../components/Document";
import { TextEditor } from "../../components/TextEditor/TextEditor";
import { DocumentLayout } from "../../layouts/Document";
import { ErrorLayout } from "../../layouts/Error";
import { InitialDocumentProvider, updateDocumentName } from "../../lib/client";
import * as Server from "../../lib/server";
import { RoomProvider } from "../../liveblocks.config";
import { Document, ErrorData } from "../../types";

export default function TextDocumentView({
  initialDocument,
  initialError,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { id, error: queryError } = router.query;
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
        <DocumentLayout
          header={<DocumentHeader onDocumentRename={updateName} />}
        >
          <TextEditor />
        </DocumentLayout>
      </InitialDocumentProvider>
    </RoomProvider>
  );
}

interface ServerSideProps {
  initialDocument: Document | null;
  initialError: ErrorData | null;
  session: Session | null;
}

// Authenticate on server and retrieve the current document
export const getServerSideProps: GetServerSideProps<ServerSideProps> = async ({
  req,
  res,
  query,
}) => {
  const documentId = query.id as string;

  const [document, session] = await Promise.all([
    Server.getDocument(req, res, { documentId }),
    Server.getServerSession(req, res),
  ]);

  const { data = null, error = null } = document;

  return {
    props: {
      initialDocument: data,
      initialError: error,
      session: session,
    },
  };
};

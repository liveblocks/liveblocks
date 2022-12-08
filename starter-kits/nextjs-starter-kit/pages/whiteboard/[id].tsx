import { LiveMap } from "@liveblocks/client";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Session } from "next-auth";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  DocumentHeader,
  DocumentHeaderSkeleton,
} from "../../components/Document";
import { Whiteboard } from "../../components/Whiteboard";
import { DocumentLayout } from "../../layouts/Document";
import { ErrorLayout } from "../../layouts/Error";
import { updateDocumentName } from "../../lib/client";
import * as Server from "../../lib/server";
import { RoomProvider } from "../../liveblocks.config";
import { Document, ErrorData } from "../../types";

export default function WhiteboardDocumentView({
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
      <DocumentLayout
        header={
          <DocumentHeader document={document} onDocumentRename={updateName} />
        }
      >
        <Whiteboard />
      </DocumentLayout>
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

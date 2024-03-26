import { ReactNode, createContext, useContext } from "react";
import { Document } from "@/types";

const DocumentContext = createContext<Document | null>(null);

type Props = {
  initialDocument: Document;
  children: ReactNode;
};

export function InitialDocumentProvider({ initialDocument, children }: Props) {
  return (
    <DocumentContext.Provider value={initialDocument}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useInitialDocument() {
  const document = useContext(DocumentContext);

  if (!document) {
    throw Error("No document passed to DocumentProvider");
  }

  return document;
}

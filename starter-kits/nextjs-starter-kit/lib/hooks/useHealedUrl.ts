import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Document } from "@/types";
import { getDocumentIdParam, isDocumentUrlHealed } from "@/utils/urls";

export function useHealedUrl(document: Document | null) {
  const { id } = useParams<{ id: string; error: string }>();

  useEffect(() => {
    if (!document) {
      return;
    }

    if (!isDocumentUrlHealed(document, id)) {
      window.history.replaceState({}, "", getDocumentIdParam(document));
    }
  }, [document, id]);
}

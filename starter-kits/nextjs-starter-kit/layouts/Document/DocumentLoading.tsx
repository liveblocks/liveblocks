import { HeaderSkeleton } from "@/components/Header";
import { DocumentSpinner } from "@/primitives/Spinner";
import { DocumentLayout } from "./Document";

export function DocumentLoading() {
  return (
    <DocumentLayout header={<HeaderSkeleton />}>
      <DocumentSpinner />
    </DocumentLayout>
  );
}

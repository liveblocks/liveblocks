import { ErrorLayout } from "@/layouts/Error";
import { getGroup } from "@/lib/database";
import { Group } from "@/types";
import { DocumentsPanel } from "./DocumentsPanel";

type Props = {
  filter?: "all" | "drafts" | "group";
  groupId?: Group["id"];
};

export async function DocumentsLayout({ filter, groupId }: Props) {
  if (groupId) {
    const group = await getGroup(groupId);
    if (!group) {
      return (
        <ErrorLayout
          error={{
            code: 400,
            message: "Group not found",
            suggestion: "Check that the current group exists",
          }}
        />
      );
    }
    return <DocumentsPanel filter={filter} group={group} />;
  }

  return <DocumentsPanel filter={filter} />;
}

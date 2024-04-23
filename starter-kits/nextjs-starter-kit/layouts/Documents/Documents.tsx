import { ErrorLayout } from "@/layouts/Error";
import { getGroup } from "@/lib/database";
import { Group } from "@/types";
import { DocumentsList } from "./DocumentsList";

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
    return <DocumentsList filter={filter} group={group} />;
  }

  return <DocumentsList filter={filter} />;
}

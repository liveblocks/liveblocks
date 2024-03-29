import useSWR from "swr";
import { getGroups } from "@/lib/actions";

export function useGroupsInfo(groupIds: string[]) {
  const { data: groups = [] } = useSWR(
    `groups_${JSON.stringify(groupIds)}`,
    async () => (groupIds.length ? getGroups(groupIds) : [])
  );
  return groups;
}

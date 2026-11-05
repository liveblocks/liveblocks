type TitleMember = {
  id: string;
  info: { name: string } | null;
  role: "tutor" | "student";
};

// Rooms aren't named explicitly: the title is the first names of everyone in
// the room, tutor first, e.g. "Chris, Flavia".
export function getRoomTitle(members: TitleMember[]) {
  const ordered = [
    ...members.filter((member) => member.role === "tutor"),
    ...members.filter((member) => member.role !== "tutor"),
  ];
  return ordered
    .map((member) => member.info?.name.split(" ")[0] || member.id)
    .join(", ");
}

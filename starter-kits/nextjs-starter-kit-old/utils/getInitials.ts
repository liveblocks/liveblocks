export function getInitials(name: string) {
  const initials = name.replace(/[^a-zA-Z- ]/g, "").match(/\b\w/g);

  return initials
    ? initials.map((initial) => initial.toUpperCase()).join("")
    : "";
}

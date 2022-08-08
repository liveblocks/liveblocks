export const TABLE_ID = "table";

export function canUseHotkeys() {
  return (
    document.activeElement === document.body ||
    document.activeElement === document.getElementById(TABLE_ID)
  );
}

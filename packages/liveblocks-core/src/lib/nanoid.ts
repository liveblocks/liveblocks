export function nanoid(length: number = 7): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,./;[]~!@#$%&*()_+=-";
  const len = alphabet.length;
  return Array.from({ length }, () =>
    alphabet.charAt(Math.floor(Math.random() * len))
  ).join("");
}

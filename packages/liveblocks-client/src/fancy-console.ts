const badge =
  "background:radial-gradient(106.94% 108.33% at -10% -5%,#ff1aa3 0,#ff881a 100%);border-radius:6px;color:#fff;padding:2px 6px";
const bold = "font-weight:600";

export const log = (message: string, ...args: readonly unknown[]) =>
  console.log("%cliveblocks", badge, message, ...args);
export const warn = (message: string, ...args: readonly unknown[]) =>
  console.warn("%cliveblocks", badge, message, ...args);
export const error = (message: string, ...args: readonly unknown[]) =>
  console.error("%cliveblocks", badge, message, ...args);

export const logBold = (
  title: string,
  message: string,
  ...args: readonly unknown[]
) => console.log(`%cliveblocks%c ${title}`, badge, bold, message, ...args);

export const warnBold = (
  title: string,
  message: string,
  ...args: readonly unknown[]
) => console.warn(`%cliveblocks%c ${title}`, badge, bold, message, ...args);

export const errorBold = (
  title: string,
  message: string,
  ...args: readonly unknown[]
) => console.error(`%cliveblocks%c ${title}`, badge, bold, message, ...args);

export type DateToString<T> = {
  [P in keyof T]: T[P] extends Date
    ? string
    : T[P] extends Date | null
      ? string | null
      : T[P] extends Date | undefined
        ? string | undefined
        : T[P];
};

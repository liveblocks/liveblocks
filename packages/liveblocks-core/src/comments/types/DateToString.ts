export type DateToString<T> = {
  [P in keyof T]: T[P] extends Date ? string : T[P];
};

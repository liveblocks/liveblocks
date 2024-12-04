/**
 * Returns a  DeepPartial<T> if T extends an object. T otherwise.
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

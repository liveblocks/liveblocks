/**
 * Extracts only the explicitly-named string keys of a type, filtering out
 * any index signature (e.g. `[key: string]: ...`).
 */
export type KnownKeys<T> = keyof {
  [K in keyof T as {} extends Record<K, 1> ? never : K]: true;
} &
  string;

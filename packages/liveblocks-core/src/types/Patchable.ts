/**
 * Extracts the optional keys (whose values are allowed to be `undefined`).
 */
type OptionalKeys<T> = Extract<
  { [K in keyof T]-?: undefined extends T[K] ? K : never }[keyof T],
  string
>;

type MakeOptionalFieldsNullable<T> = {
  [K in keyof T]: K extends OptionalKeys<T> ? T[K] | null : T[K];
};

/**
 * Like Partial<T>, but also allows `null` for optional fields. Useful for
 * representing patches where `null` means "remove this field" and `undefined`
 * means "leave this field unchanged".
 */
export type Patchable<T> = Partial<MakeOptionalFieldsNullable<T>>;

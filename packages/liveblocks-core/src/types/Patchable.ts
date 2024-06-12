type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

type MakeOptionalFieldsNullable<T> = {
  [K in keyof T]: K extends OptionalKeys<T> ? T[K] | null : T[K];
};

export type Patchable<T> = Partial<MakeOptionalFieldsNullable<T>>;

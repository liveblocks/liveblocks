type RenameDataField<T, TFieldName extends string> = T extends any
  ? { [K in keyof T as K extends "data" ? TFieldName : K]: T[K] }
  : never;

export type AsyncLoading<F extends string = "data"> = RenameDataField<
  {
    readonly isLoading: true;
    readonly data?: never;
    readonly error?: never;
  },
  F
>;

export type AsyncSuccess<T, F extends string = "data"> = RenameDataField<
  {
    readonly isLoading: false;
    readonly data: T;
    readonly error?: never;
  },
  F
>;
export type AsyncError<F extends string = "data"> = RenameDataField<
  {
    readonly isLoading: false;
    readonly data?: never;
    readonly error: Error;
  },
  F
>;

export type AsyncResult<T, F extends string = "data"> =
  | AsyncLoading<F>
  | AsyncSuccess<T, F>
  | AsyncError<F>;

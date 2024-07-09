type RenameDataField<T, TFieldName extends string> = T extends any
  ? { [K in keyof T as K extends "data" ? TFieldName : K]: T[K] }
  : never;

export type AsyncResult<T> =
  // loading
  | {
      readonly isLoading: true;
      readonly data?: never;
      readonly error?: never;
    }

  // success
  | {
      readonly isLoading: false;
      readonly data: T;
      readonly error?: never;
    }

  // error
  | {
      readonly isLoading: false;
      readonly data?: never;
      readonly error: Error;
    };

export type AsyncResultWithDataField<
  T,
  TDataField extends string,
> = RenameDataField<AsyncResult<T>, TDataField>;

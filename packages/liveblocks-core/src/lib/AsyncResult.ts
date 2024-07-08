export type AsyncResult<T> =
  // loading
  | { isLoading: true; data?: never; error?: never }

  // success
  | { isLoading: false; data: T; error?: never }

  // error
  | { isLoading: false; data?: never; error: Error };

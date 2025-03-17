/**
 * Like `new AbortController()`, but where the result can be unpacked
 * safely, i.e. `const { signal, abort } = makeAbortController()`.
 *
 * This unpacking is unsafe to do with a regular `AbortController` because
 * the `abort` method is not bound to the controller instance.
 *
 * In addition to this, you can also pass an optional (external)
 * AbortSignal to "wrap", in which case the returned signal will be in
 * aborted state when either the signal is aborted externally or
 * internally.
 */
export function makeAbortController(externalSignal?: AbortSignal): {
  signal: AbortSignal;
  abort: () => void;
} {
  const ctl = new AbortController();
  return {
    signal: externalSignal
      ? AbortSignal.any([ctl.signal, externalSignal])
      : ctl.signal,
    abort: ctl.abort.bind(ctl),
  };
}

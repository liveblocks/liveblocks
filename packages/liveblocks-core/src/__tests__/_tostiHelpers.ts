// XXX Port this thing over to tosti?
export function assertDoesntThrow(fn: () => void) {
  try {
    fn();
  } catch (err) {
    throw new Error(`Function threw an error: ${(err as Error).message}`);
  }
}

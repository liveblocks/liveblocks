export function assertNever(_value: never, msg: string): never {
  throw new Error(msg);
}

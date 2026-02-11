const ctxs = new WeakMap<Request, unknown>();

export function lookupContext<C = unknown>(req: Request): C | undefined {
  return (ctxs as WeakMap<Request, C>).get(req);
}

export function attachContext<C>(req: Request, ctx: C): C {
  ctxs.set(req, ctx);
  return ctx;
}

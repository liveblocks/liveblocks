import { expectType } from "tsd";
import { ZenRelay, ZenRouter } from "@liveblocks/zenrouter";

declare const req: Request;

async () => {
  const app = new ZenRelay();
  app
    .relay("/foo/*", new ZenRouter())
    .relay("/bar/*", new ZenRouter())
    .relay("/qux/*", new ZenRouter())
    .relay("/*", new ZenRouter());
  expectType<Response>(await app.fetch(req, 1, "a", true));
};

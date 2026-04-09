import type { BaseMetadata } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  User,
} from "@liveblocks/client";
import { describe, expectTypeOf, test } from "vitest";

type Presence = JsonObject;
type Storage = LsonObject;
type UserMeta = BaseUserMeta;
type RoomEvent = Json;
type ThreadMetadata = BaseMetadata;
type CommentMetadata = BaseMetadata;

type P = Presence;
type S = Storage;
type U = UserMeta;
type E = RoomEvent;
type TM = ThreadMetadata;
type CM = CommentMetadata;

describe("Room", () => {
  describe("enterRoom", () => {
    test("should expose typed room ID and leave()", () => {
      const client = createClient<U>({ publicApiKey: "pk_whatever" });

      const { room, leave } = client.enterRoom<P, S, E, TM, CM>("my-room", {
        initialPresence: {},
      });

      expectTypeOf(room.id).toEqualTypeOf<string>();
      expectTypeOf(leave()).toEqualTypeOf<void>();
    });
  });

  describe('subscribe("others")', () => {
    test("should narrow others event payloads", () => {
      const client = createClient<U>({ publicApiKey: "pk_whatever" });
      const { room } = client.enterRoom<P, S, E, TM, CM>("my-room", {
        initialPresence: {},
      });

      room.subscribe("others", (others, event) => {
        expectTypeOf(others).toEqualTypeOf<readonly User<P, U>[]>();

        switch (event.type) {
          case "enter":
            expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
            return;
          case "leave":
            expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
            return;
          case "update":
            expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
            expectTypeOf(event.updates).toEqualTypeOf<Partial<P>>();
            return;
          case "reset":
            return;
          default:
            expectTypeOf(event).toEqualTypeOf<never>();
        }
      });
    });
  });

  describe("events.others", () => {
    test("should narrow others event payloads", () => {
      const client = createClient<U>({ publicApiKey: "pk_whatever" });
      const { room } = client.enterRoom<P, S, E, TM, CM>("my-room", {
        initialPresence: {},
      });

      room.events.others.subscribe((event) => {
        expectTypeOf(event.others).toEqualTypeOf<readonly User<P, U>[]>();

        switch (event.type) {
          case "enter":
            expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
            return;
          case "leave":
            expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
            return;
          case "update":
            expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
            expectTypeOf(event.updates).toEqualTypeOf<Partial<P>>();
            return;
          case "reset":
            return;
          default:
            expectTypeOf(event).toEqualTypeOf<never>();
        }
      });
    });
  });
});

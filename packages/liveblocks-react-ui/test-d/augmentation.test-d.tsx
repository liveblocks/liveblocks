import type {
  CommentAttachment,
  InboxNotificationData,
  LiveList,
  LiveMap,
  LiveObject,
  ThreadVisibility,
} from "@liveblocks/core";
import type { InboxNotificationCustomKindProps } from "@liveblocks/react-ui";
import { Composer, InboxNotification } from "@liveblocks/react-ui";
import { describe, expectTypeOf, test } from "vitest";

// TODO: Create type tests for all components/props

//
// User-provided type augmentations
//
declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number };
    };

    Storage: {
      animals: LiveList<string>;
      scores: LiveMap<string, number>;
      person: LiveObject<{ name: string; age: number }>;
    };

    UserMeta: {
      info: {
        name: string;
        age: number;
      };
    };

    RoomEvent:
      | { type: "emoji"; emoji: string }
      | { type: "beep"; times?: number };

    ThreadMetadata: {
      color: "red" | "blue";
    };

    CommentMetadata: {
      priority: number;
      reviewed?: boolean;
    };

    RoomInfo: {
      name: string;
      url?: string;
      type: "public" | "private";
    };

    GroupInfo: {
      name: string;
      avatar?: string;
      type: "open" | "closed";
    };

    ActivitiesData: {
      $myErrorNotification: {
        message: string;
        code: number;
      };
      $myUploadNotification: {
        duration: number;
        uploadId: string;
      };
    };
  }
}

describe("Composer (with Liveblocks augmentation)", () => {
  test("accepts props for creating threads", () => {
    void (
      <Composer
        metadata={{ color: "red" }}
        commentMetadata={{ priority: 1, reviewed: false }}
        visibility="private"
        onComposerSubmit={(comment, event) => {
          expectTypeOf(comment.body.version).toEqualTypeOf<1>();
          expectTypeOf(comment.attachments).toEqualTypeOf<
            CommentAttachment[]
          >();
          expectTypeOf(event.preventDefault).toBeFunction();
        }}
      />
    );

    void (
      (
        // @ts-expect-error - invalid thread visibility
        <Composer metadata={{ color: "red" }} visibility="secret" />
      )
    );
    void (
      (
        // @ts-expect-error - visibility only applies when creating threads
        <Composer threadId="th_123" visibility="private" />
      )
    );
  });

  test("accepts props for creating comments", () => {
    void (
      <Composer
        threadId="th_123"
        commentMetadata={{ priority: 1, reviewed: false }}
      />
    );

    void (
      (
        // @ts-expect-error - thread metadata only applies when creating threads
        <Composer threadId="th_123" metadata={{ color: "red" }} />
      )
    );
    void (
      (
        // @ts-expect-error - commentId requires threadId
        <Composer commentId="cm_123" />
      )
    );
  });

  test("accepts props for editing comments", () => {
    void (
      <Composer
        threadId="th_123"
        commentId="cm_123"
        commentMetadata={{ priority: 1, reviewed: null }}
      />
    );

    void (
      (
        // @ts-expect-error - thread metadata only applies when creating threads
        <Composer
          threadId="th_123"
          commentId="cm_123"
          metadata={{ color: "red" }}
        />
      )
    );
  });
});

describe("InboxNotification `kinds` (with Liveblocks augmentation)", () => {
  test("existing kinds have the expected props types", () => {
    void (
      <InboxNotification
        inboxNotification={{} as InboxNotificationData}
        kinds={{
          thread: (props) => {
            expectTypeOf(
              props.inboxNotification.threadId
            ).toEqualTypeOf<string>();
            // @ts-expect-error - `activities` is not on thread notifications
            void props.inboxNotification.activities;

            return <InboxNotification.Thread {...props} />;
          },
          textMention: (props) => {
            expectTypeOf(
              props.inboxNotification.mentionId
            ).toEqualTypeOf<string>();
            // @ts-expect-error - `activities` is not on text-mention notifications
            void props.inboxNotification.activities;

            return <InboxNotification.TextMention {...props} />;
          },
          $myErrorNotification: (props) => {
            expectTypeOf(
              props.inboxNotification.activities[0]!.data.message
            ).toEqualTypeOf<string>();
            expectTypeOf(
              props.inboxNotification.activities[0]!.data.code
            ).toEqualTypeOf<number>();
            // @ts-expect-error - invalid activity data field
            void props.inboxNotification.activities[0]!.data.nonexisting;
            // @ts-expect-error - `threadId` is not on this custom kind
            void props.inboxNotification.threadId;
            // @ts-expect-error - `mentionId` is not on this custom kind
            void props.inboxNotification.mentionId;

            return (
              <InboxNotification.Custom {...props} title="Title">
                Content
              </InboxNotification.Custom>
            );
          },
        }}
      />
    );
  });

  test("rejects custom kind keys that are not declared in ActivitiesData", () => {
    void (
      <InboxNotification
        inboxNotification={{} as InboxNotificationData}
        kinds={{
          // @ts-expect-error - `$myNonExistingNotification` is not in ActivitiesData
          $myNonExistingNotification: (_props: any) => null,
        }}
      />
    );
  });

  test("custom kind props types work in external components", () => {
    function MyCustomInboxNotification({
      inboxNotification,
      ...props
    }: InboxNotificationCustomKindProps) {
      expectTypeOf(inboxNotification.activities[0]!.data).toEqualTypeOf<
        | { message: string; code: number }
        | { duration: number; uploadId: string }
      >();

      return (
        <InboxNotification.Custom
          inboxNotification={inboxNotification}
          {...props}
          title="Title"
        >
          Content
        </InboxNotification.Custom>
      );
    }

    function MySpecificCustomInboxNotification({
      inboxNotification,
      ...props
    }: InboxNotificationCustomKindProps<"$myErrorNotification">) {
      expectTypeOf(
        inboxNotification.activities[0]!.data.message
      ).toEqualTypeOf<string>();
      expectTypeOf(
        inboxNotification.activities[0]!.data.code
      ).toEqualTypeOf<number>();
      // @ts-expect-error - invalid activity data field
      void inboxNotification.activities[0]!.data.nonexisting;

      return (
        <InboxNotification.Custom
          inboxNotification={inboxNotification}
          {...props}
          title="Title"
        >
          Content
        </InboxNotification.Custom>
      );
    }

    void (
      <InboxNotification
        inboxNotification={{} as InboxNotificationData}
        kinds={{
          $myErrorNotification: MyCustomInboxNotification,
          $myUploadNotification: MyCustomInboxNotification,
        }}
      />
    );

    void (
      <InboxNotification
        inboxNotification={{} as InboxNotificationData}
        kinds={{
          $myErrorNotification: MySpecificCustomInboxNotification,
          // @ts-expect-error - handler is typed only for `$myErrorNotification`
          $myUploadNotification: MySpecificCustomInboxNotification,
        }}
      />
    );
  });
});

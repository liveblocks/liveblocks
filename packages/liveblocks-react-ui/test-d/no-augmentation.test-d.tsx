import type { ActivityData, InboxNotificationData } from "@liveblocks/core";
import type { InboxNotificationCustomKindProps } from "@liveblocks/react-ui";
import { Composer, InboxNotification } from "@liveblocks/react-ui";
import { describe, expectTypeOf, test } from "vitest";

// TODO: Create type tests for all components/props

describe("Composer (no Liveblocks augmentation)", () => {
  test("accepts metadata props for each mode", () => {
    void (
      <Composer
        metadata={{ color: "purple", page: 1, pinned: true }}
        commentMetadata={{ tag: "important", spam: false }}
        visibility="private"
      />
    );

    void (
      <Composer
        threadId="th_123"
        commentMetadata={{ tag: "important", spam: false }}
      />
    );

    void (
      <Composer
        threadId="th_123"
        commentId="cm_123"
        commentMetadata={{ spam: null }}
      />
    );
  });

  test("keeps thread-only props out of reply and edit modes", () => {
    void (
      (
        // @ts-expect-error - visibility only applies when creating threads
        <Composer threadId="th_123" visibility="private" />
      )
    );
    void (
      (
        // @ts-expect-error - thread metadata only applies when creating threads
        <Composer threadId="th_123" metadata={{ color: "purple" }} />
      )
    );
    void (
      (
        // @ts-expect-error - commentId requires threadId
        <Composer commentId="cm_123" />
      )
    );
    void (
      (
        // @ts-expect-error - thread metadata only applies when creating threads
        <Composer
          threadId="th_123"
          commentId="cm_123"
          metadata={{ color: "purple" }}
        />
      )
    );
  });
});

describe("InboxNotification `kinds` (no Liveblocks augmentation)", () => {
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
              props.inboxNotification.activities[0]!.data
            ).toEqualTypeOf<ActivityData>();
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

  test("allows arbitrary custom kind keys when ActivitiesData is not augmented", () => {
    void (
      <InboxNotification
        inboxNotification={{} as InboxNotificationData}
        kinds={{
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
      expectTypeOf(
        inboxNotification.activities[0]!.data
      ).toEqualTypeOf<ActivityData>();

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
        inboxNotification.activities[0]!.data
      ).toEqualTypeOf<ActivityData>();

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
          // @ts-expect-error - handler is typed only for `$myErrorNotification`
          $myErrorNotification: MySpecificCustomInboxNotification,
          // @ts-expect-error - handler is typed only for `$myErrorNotification`
          $myUploadNotification: MySpecificCustomInboxNotification,
        }}
      />
    );
  });
});

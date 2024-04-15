"use server";

export async function send() {
  console.log("test");
  try {
    const response = await fetch(
      `https://api.liveblocks.io/v2/inbox-notifications`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer sk_dev_OpOka6YFx0_V7NTGxlHyX_s3hEDSt8849Z9cgu3Lw3F2hjWdKIax_W0ndwMRyqY7`,
        },
        body: JSON.stringify({
          userId: "user-1",
          roomId: "my-room",
          kind: "$coolThing",
          subjectId: "my-notification",
          activityData: {
            customThing: true,
          },
        }),
      }
    );
    if (!response.ok) {
      // console.log(response);
      //return;
    }

    const result = await response.json();
    console.log(result);
  } catch (err) {
    console.log(err);
  }
  return null;
}

import { describe, expect, test } from "vitest";

import { parseAuthToken } from "../../protocol/AuthToken";

describe("parseRoomAuthToken", () => {
  const exampleAccessToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzM1MjEsImV4cCI6MTY5MDAzMzUyNiwiayI6ImFjYyIsInBpZCI6IjYyNDFjYjk1ZWQ2ODdkNWRlNWFhYTEzMiIsInVpZCI6InVzZXItMTEiLCJwZXJtcyI6eyJ0ZXN0LXJvb20iOlsicm9vbTp3cml0ZSIsImNvbW1lbnRzOndyaXRlIl19LCJtY3ByIjoyMH0.YanPltrzS9ct5E9w6i14s_JEy9rpm4MNSMGPgN1B26JP0LVaj0ac3kK5m1owjWS_HTANB87KYk0tOHGDjEESIN0Kr-1d6Qv31IX1yUTsRiPyaD4J6co0M9ONDEbhiWc-ScV2UI-fQlY1qvqFAP5VR4CIwCRnA_hwBFzzhAQhb7VWSKASaqL72ySv9f-LU4cekqJ_nWLLpOGnnjiQSqOFqe7PSPjQiawm8R8UU_P5kEtKr53YS0oBhIiH9e3dpP8HPiaP6kCN1ViDo0jHIX3oyNB4IcwNf-VMPCUHi8oXG09Kfa2rdI2MT7E_Tblg78ZPnSCKLjTEHykGZsc4v-kDIg";

  const exampleIdToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTAwMzM2MTQsImV4cCI6MTY5MDAzMzYxOSwiayI6ImlkIiwicGlkIjoiNjI0MWNiOTVlZDY4N2Q1ZGU1YWFhMTMyIiwidWlkIjoidXNlci0yIiwiZ2lkcyI6W10sIm1jcHIiOjIwfQ.qg6lme3yhWYZ77l_ignjEwVuow1f79xYEdFYTO39VnyuQRv39xJU_lRpUC053p5UEYR9wV2f9B_U1G1xBtS0Yk894O078JiKN1zvizAgJmTrG0ZFzzEJLoMo00RpeGKP2qZEXNyHPqFVdzP9vHUVK0D4CIEHanLUOYaHA3JTslUWiKfF7OoWIMpYMx_oIgdkAV3pvkMpYuV0UkVGuMgrxUXCNKcURAfTK2BhtfmT3n7pDBpstrIYEotcWjpBcm6Xat5kG9FECUs_iEJvlnWKidCSbSp3YGutCxH0XXwbTK9O-a6YBrQTAOofHFHsy6_dE4Z3uyQe79uX82YqdxJIzg";

  const exampleInvalidJwtToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  test("should parse a valid (id) token", () => {
    const { parsed } = parseAuthToken(exampleIdToken);
    expect(parsed).toEqual({
      exp: 1690033619,
      gids: [],
      iat: 1690033614,
      k: "id",
      mcpr: 20,
      pid: "6241cb95ed687d5de5aaa132",
      uid: "user-2",
    });
  });

  test("should parse a valid (access) token", () => {
    const { parsed } = parseAuthToken(exampleAccessToken);
    expect(parsed).toEqual({
      k: "acc",
      exp: 1690033526,
      iat: 1690033521,
      mcpr: 20,
      perms: {
        "test-room": ["room:write", "comments:write"],
      },
      pid: "6241cb95ed687d5de5aaa132",
      uid: "user-11",
    });
  });

  test("should throw if token is not a valid token", () => {
    try {
      parseAuthToken(exampleInvalidJwtToken);
    } catch (error) {
      expect(error).toEqual(
        new Error(
          "Authentication error: expected a valid token but did not get one. Hint: if you are using a callback, ensure the room is passed when creating the token. For more information: https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback"
        )
      );
    }
  });
});

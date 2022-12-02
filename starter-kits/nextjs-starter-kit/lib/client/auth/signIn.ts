import { setCookie } from "cookies-next";
import { signIn as nextAuthSignIn } from "next-auth/react";
import Router from "next/router";
import { AUTHENTICATION_DEMO_MODE } from "../../../liveblocks.config";

export const signIn = AUTHENTICATION_DEMO_MODE ? demoSignIn : nextAuthSignIn;

// === EVERYTHING BELOW ONLY NECESSARY FOR DEMO AUTH ===========================

function demoSignIn(userId?: string): void {
  if (!userId) {
    Router.replace("/signin");
    return;
  }

  setCookie("demoAuthUser", userId);
  Router.reload();
}

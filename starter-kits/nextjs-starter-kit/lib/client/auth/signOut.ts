import { deleteCookie } from "cookies-next";
import { signOut as nextAuthSignOut } from "next-auth/react";
import Router from "next/router";
import { AUTHENTICATION_DEMO_MODE } from "../../../liveblocks.config";

export const signOut = AUTHENTICATION_DEMO_MODE ? demoSignOut : nextAuthSignOut;

// === EVERYTHING BELOW ONLY NECESSARY FOR DEMO AUTH ===========================

function demoSignOut() {
  deleteCookie("demoAuthUser");
  Router.reload();
}

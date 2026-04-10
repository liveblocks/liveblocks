"use server";

import { signIn as signInAuth } from "@/auth";

export async function signIn() {
  await signInAuth();
}

import { TypeSafeClient } from "@typesafe-ai/sdk";

// Jev is TypeSafe's System One model: it answers typed questions (choice,
// score, yes/no) about a piece of state and returns calibrated probabilities
// instead of free text. The sparkle buttons for properties and labels use it.
//
// Reads TYPESAFE_API_KEY (and optional TYPESAFE_DEFAULT_MODEL) from the
// environment. Created lazily so the rest of the app runs without the key.
let client: TypeSafeClient | null = null;

export function getTypeSafeClient(): TypeSafeClient {
  if (!client) {
    if (!process.env.TYPESAFE_API_KEY) {
      throw new Error(
        "Missing TYPESAFE_API_KEY. Add it to .env.local to enable the AI property and label buttons."
      );
    }
    client = new TypeSafeClient();
  }
  return client;
}

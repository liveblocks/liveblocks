import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

export default function Page() {
  redirect(`/${nanoid()}`);
}

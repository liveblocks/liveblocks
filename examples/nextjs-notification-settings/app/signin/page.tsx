import { SignIn } from "./_components/signin";

export default async function Page() {
  return (
    <div className="flex flex-col w-full items-center justify-center h-screen">
      <SignIn />
    </div>
  );
}

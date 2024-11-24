import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  user: {
    name: string;
    username: string;
    avatar: string;
  };
};

export function PostUI({ user, children }: Props) {
  return (
    <div className="flex gap-2 group w-full">
      <div className="flex flex-col items-center gap-1 pb-1">
        <div className="bg-gray-200 w-10 h-10 rounded-full overflow-hidden shrink-0">
          <img className="h-full w-full" src={user.avatar} />
        </div>
        <div className="w-[3px] bg-gray-200/80 h-full flex-grow group-last:hidden flex-1" />
      </div>
      <div className="grow">
        <div className="flex gap-1 whitespace-nowrap">
          <span className="font-semibold">{user.name}</span>
          <span className="text-gray-500">{user.username}</span>
        </div>
        <div className="relative pb-8">{children}</div>
      </div>
    </div>
  );
}

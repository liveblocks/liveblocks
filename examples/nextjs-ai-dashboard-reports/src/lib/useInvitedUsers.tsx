import React, { createContext, useContext, useState, ReactNode } from "react";
import { users as defaultUsers } from "@/data/users";

// Type for a user (copied from users.ts structure)
export type InvitedUser = (typeof defaultUsers)[number];

interface InvitedUsersContextType {
  invitedUsers: InvitedUser[];
  inviteUser: (user: Pick<InvitedUser, "name" | "email">) => void;
}

const InvitedUsersContext = createContext<InvitedUsersContextType | undefined>(
  undefined
);

export function InvitedUsersProvider({ children }: { children: ReactNode }) {
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);

  const inviteUser = (user: Pick<InvitedUser, "name" | "email">) => {
    setInvitedUsers((prev) => [
      {
        name: user.name,
        email: user.email,
        initials:
          user.name.split(" ").length > 1
            ? user.name.split(" ")[0][0] + user.name.split(" ")[1][0]
            : user.name[0],
        permission: "admin",
        color: "blue",
        avatar: "",
        status: "pending",
        dateAdded: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        lastActive: "--",
      },
      ...prev,
    ]);
  };

  return (
    <InvitedUsersContext.Provider value={{ invitedUsers, inviteUser }}>
      {children}
    </InvitedUsersContext.Provider>
  );
}

export function useInvitedUsers() {
  const context = useContext(InvitedUsersContext);
  if (!context) {
    throw new Error(
      "useInvitedUsers must be used within an InvitedUsersProvider"
    );
  }
  return context;
}

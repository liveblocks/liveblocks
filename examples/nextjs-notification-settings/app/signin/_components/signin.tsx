"use client";

import { useCallback } from "react";
import { signIn } from "next-auth/react";

import { users } from "@/data/users";
import { getInitials } from "@/utils/get-initials";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SignIn() {
  const handleChange = useCallback((value: string) => {
    signIn("credentials", { email: value });
  }, []);

  const items = users.map((user) => ({
    value: user.id,
    title: user.name,
    picture: user.picture,
  }));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-bold">Sign in to your account</h3>
      <Select onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a profile…" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <div className="flex flex-row items-center gap-1">
                <Avatar className="size-6">
                  <AvatarImage src={item.picture} alt={item.title} />
                  <AvatarFallback>{getInitials(item.title)}</AvatarFallback>
                </Avatar>
                <span>{item.title}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

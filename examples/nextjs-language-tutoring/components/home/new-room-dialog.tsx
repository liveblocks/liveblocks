"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LessonRoom } from "@/lib/api";
import {
  isLanguageCode,
  LANGUAGES,
  type LanguageCode,
} from "@/lib/languages";

export function NewRoomDialog({
  onCreated,
}: {
  onCreated?: (room: LessonRoom) => void;
}) {
  const { api, href } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("es");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const room = await api<LessonRoom>("/api/rooms", {
        method: "POST",
        json: { name, language },
      });
      onCreated?.(room);
      setOpen(false);
      router.push(href(`/rooms/${encodeURIComponent(room.id)}`));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create the room"
      );
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName("");
          setPending(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          New room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a lesson room</DialogTitle>
            <DialogDescription>
              A room is a permanent space for you and one student. You can
              invite them afterwards with a link.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Room name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Spanish with Marie"
                maxLength={80}
                required
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Language
              <Select
                value={language}
                onValueChange={(value) => {
                  if (isLanguageCode(value)) {
                    setLanguage(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      <span aria-hidden>{item.flag}</span> {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Create room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

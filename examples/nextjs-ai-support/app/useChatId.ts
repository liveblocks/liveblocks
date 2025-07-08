import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";

// Store and load the last chat ID using localStorage
// On mount, if the last chat was created over an hour ago, create a new ID
// Also a function to create a new chat ID
export function useChatId() {
  const [chatId, setChatId] = useState<string>("");

  function getStoredChat() {
    const id = localStorage.getItem("lastChatId");
    const time = localStorage.getItem("lastChatTime");
    return id && time ? { id, time: Number(time) } : null;
  }

  function setStoredChat(id: string, time: number) {
    localStorage.setItem("lastChatId", id);
    localStorage.setItem("lastChatTime", time.toString());
  }

  useEffect(() => {
    const stored = getStoredChat();
    const now = Date.now();
    if (stored && now - stored.time < 60 * 60 * 1000) {
      setChatId(stored.id);
    } else {
      const newId = nanoid();
      setChatId(newId);
      setStoredChat(newId, now);
    }
  }, []);

  useEffect(() => {
    if (chatId) {
      setStoredChat(chatId, Date.now());
    }
  }, [chatId]);

  const createNewChat = useCallback(() => {
    const newId = nanoid();
    setChatId(newId);
    setStoredChat(newId, Date.now());
  }, []);

  return { chatId, setChatId, createNewChat };
}

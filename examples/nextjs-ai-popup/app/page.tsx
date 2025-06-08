"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientSideSuspense } from "@liveblocks/react";
import { SharedAiChat } from "./SharedAiChat";

export default function Page() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    urlType: "iframe" as "iframe" | "picture",
    iframeUrl: "",
    pictureUrl: "",
    theme: "light" as "light" | "dark",
    title: "",
    description: "",
    suggestions: [""],
    copilotId: "",
    accentColor: "",
  });

  const addSuggestion = () => {
    if (formData.suggestions.length < 5) {
      setFormData((prev) => ({
        ...prev,
        suggestions: [...prev.suggestions, ""],
      }));
    }
  };

  const removeSuggestion = (index: number) => {
    if (formData.suggestions.length > 1) {
      setFormData((prev) => ({
        ...prev,
        suggestions: prev.suggestions.filter((_, i) => i !== index),
      }));
    }
  };

  const updateSuggestion = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s, i) => (i === index ? value : s)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      urlType: formData.urlType,
      url:
        formData.urlType === "iframe"
          ? formData.iframeUrl
          : formData.pictureUrl,
      theme: formData.theme,
      title: formData.title,
      description: formData.description,
      suggestions: JSON.stringify(formData.suggestions.filter((s) => s.trim())),
    });

    if (formData.copilotId.trim()) {
      params.set("copilotId", formData.copilotId.trim());
    }
    if (formData.accentColor.trim()) {
      params.set("accentColor", formData.accentColor.trim());
    }

    router.push(`/preview?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-neutral-100">
            Customize AI Chat Popup
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                Content Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-neutral-900 dark:text-neutral-100">
                  <input
                    type="radio"
                    name="urlType"
                    value="iframe"
                    checked={formData.urlType === "iframe"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        urlType: e.target.value as "iframe",
                      }))
                    }
                    className="mr-2"
                  />
                  Website
                </label>
                <label className="flex items-center text-neutral-900 dark:text-neutral-100">
                  <input
                    type="radio"
                    name="urlType"
                    value="picture"
                    checked={formData.urlType === "picture"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        urlType: e.target.value as "picture",
                      }))
                    }
                    className="mr-2"
                  />
                  Image
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                {formData.urlType === "iframe" ? "Website URL" : "Image URL"}
              </label>
              <input
                type="url"
                value={
                  formData.urlType === "iframe"
                    ? formData.iframeUrl
                    : formData.pictureUrl
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    [formData.urlType === "iframe"
                      ? "iframeUrl"
                      : "pictureUrl"]: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                placeholder={
                  formData.urlType === "iframe"
                    ? "https://example.com"
                    : "https://example.com/image.jpg"
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                Theme
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-neutral-900 dark:text-neutral-100">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={formData.theme === "light"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        theme: e.target.value as "light",
                      }))
                    }
                    className="mr-2"
                  />
                  Light
                </label>
                <label className="flex items-center text-neutral-900 dark:text-neutral-100">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={formData.theme === "dark"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        theme: e.target.value as "dark",
                      }))
                    }
                    className="mr-2"
                  />
                  Dark
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                placeholder="How can I help you?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                rows={3}
                placeholder="Ask me anything..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                Suggestions
              </label>
              {formData.suggestions.map((suggestion, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={suggestion}
                    onChange={(e) => updateSuggestion(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    placeholder="Try asking about..."
                  />
                  {formData.suggestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSuggestion(index)}
                      className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {formData.suggestions.length < 5 && (
                <button
                  type="button"
                  onClick={addSuggestion}
                  className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                >
                  + Add Suggestion
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                Copilot ID
              </label>
              <input
                type="text"
                value={formData.copilotId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    copilotId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                placeholder="co_1234567890123456789012"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                Accent Color
              </label>
              <input
                type="text"
                value={formData.accentColor}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accentColor: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                placeholder="#4f46e5"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 dark:bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700"
            >
              Preview Chat
            </button>
          </form>
        </div>

        <div
          className={`bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm ${
            formData.theme === "dark" ? "dark" : ""
          }`}
        >
          <h2 className="text-xl font-semibold mb-4 text-neutral-900">
            Preview
          </h2>
          <div className="relative h-96 bg-neutral-50 dark:bg-neutral-900 rounded-lg overflow-hidden border dark:border-neutral-900 pointer-events-none">
            <ClientSideSuspense fallback={<div>Loading...</div>}>
              <SharedAiChat
                title={formData.title || "How can I help you?"}
                description={formData.description}
                suggestions={formData.suggestions.filter((s) => s.trim())}
                theme={formData.theme}
                copilotId={formData.copilotId}
                accentColor={formData.accentColor}
                chatId="preview-chat"
                className="h-full"
              />
            </ClientSideSuspense>
          </div>
        </div>
      </div>
    </div>
  );
}

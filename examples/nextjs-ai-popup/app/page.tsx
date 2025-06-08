"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiChat } from "@liveblocks/react-ui";
import { useSendAiMessage } from "@liveblocks/react";
import { ClientSideSuspense } from "@liveblocks/react";

export default function Page() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    urlType: "iframe" as "iframe" | "picture",
    iframeUrl: "",
    pictureUrl: "",
    theme: "light" as "light" | "dark",
    title: "",
    description: "",
    suggestions: [""]
  });

  const addSuggestion = () => {
    if (formData.suggestions.length < 5) {
      setFormData(prev => ({
        ...prev,
        suggestions: [...prev.suggestions, ""]
      }));
    }
  };

  const removeSuggestion = (index: number) => {
    if (formData.suggestions.length > 1) {
      setFormData(prev => ({
        ...prev,
        suggestions: prev.suggestions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateSuggestion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      suggestions: prev.suggestions.map((s, i) => i === index ? value : s)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      urlType: formData.urlType,
      url: formData.urlType === "iframe" ? formData.iframeUrl : formData.pictureUrl,
      theme: formData.theme,
      title: formData.title,
      description: formData.description,
      suggestions: JSON.stringify(formData.suggestions.filter(s => s.trim()))
    });
    router.push(`/preview?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-6">Customize AI Chat Popup</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Content Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="urlType"
                    value="iframe"
                    checked={formData.urlType === "iframe"}
                    onChange={(e) => setFormData(prev => ({ ...prev, urlType: e.target.value as "iframe" }))}
                    className="mr-2"
                  />
                  Iframe URL
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="urlType"
                    value="picture"
                    checked={formData.urlType === "picture"}
                    onChange={(e) => setFormData(prev => ({ ...prev, urlType: e.target.value as "picture" }))}
                    className="mr-2"
                  />
                  Picture URL
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {formData.urlType === "iframe" ? "Iframe URL" : "Picture URL"}
              </label>
              <input
                type="url"
                value={formData.urlType === "iframe" ? formData.iframeUrl : formData.pictureUrl}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [formData.urlType === "iframe" ? "iframeUrl" : "pictureUrl"]: e.target.value
                }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md"
                placeholder={formData.urlType === "iframe" ? "https://example.com" : "https://example.com/image.jpg"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={formData.theme === "light"}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value as "light" }))}
                    className="mr-2"
                  />
                  Light
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={formData.theme === "dark"}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value as "dark" }))}
                    className="mr-2"
                  />
                  Dark
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md"
                placeholder="How can I help you?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-md"
                rows={3}
                placeholder="Ask me anything..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Suggestions</label>
              {formData.suggestions.map((suggestion, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={suggestion}
                    onChange={(e) => updateSuggestion(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-md"
                    placeholder="Try asking about..."
                  />
                  {formData.suggestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSuggestion(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
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
                  className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  + Add Suggestion
                </button>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              Preview Chat
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <div className="relative h-96 bg-neutral-50 rounded-lg overflow-hidden">
            <ClientSideSuspense fallback={<div>Loading...</div>}>
              <PreviewChat
                title={formData.title || "How can I help you?"}
                description={formData.description}
                suggestions={formData.suggestions.filter(s => s.trim())}
                theme={formData.theme}
              />
            </ClientSideSuspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewChat({ title, description, suggestions, theme }: {
  title: string;
  description: string;
  suggestions: string[];
  theme: "light" | "dark";
}) {
  return (
    <div className={`h-full ${theme === "dark" ? "dark" : ""}`}>
      <AiChat
        layout="compact"
        chatId="preview-chat"
        components={{
          Empty: ({ chatId }) => {
            const sendMessage = useSendAiMessage(chatId);
            return (
              <div className="p-4 h-full flex flex-col gap-4 justify-end">
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  {description && <p className="text-sm text-neutral-600 mt-1">{description}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-full hover:bg-neutral-50"
                      onClick={() => sendMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
        }}
        className="h-full"
      />
    </div>
  );
}

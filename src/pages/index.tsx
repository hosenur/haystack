import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Input } from "@/components/ui/input";
import AppLayout from "@/layouts/app-layout";
import useSWR, { mutate } from "swr";

import { cn } from "@/lib/utils";
import { withAuth, WithAuthProps } from "@/lib/with-auth";
import type { BundledTheme } from 'shiki';
import {
  RiExternalLinkLine,
  RiLink,
  RiLoader2Fill,
  RiLogoutBoxLine,
  RiSearch2Line,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactLenis } from "lenis/react";
import * as React from "react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Streamdown as Markdown } from "streamdown";
import { Mirage } from "ldrs/react";
import "ldrs/react/Mirage.css";
import IconStar from "@/components/star";
import IconTool from "@/components/tool";
const themes = ['github-light', 'github-dark'] as [BundledTheme, BundledTheme];

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  searchBookmarks: "Search Bookmarks",
  createBookmark: "Create Bookmark",
};

interface BookmarkFields {
  url: string;
  title: string;
}

interface SearchHit {
  _id: string;
  _score: number;
  fields: BookmarkFields;
}

const createBookmark = async (data: { url: string }) => {
  const res = await fetch("/api/bookmark/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create bookmark");
  }
  return res.json();
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

const HomePage: React.FC<WithAuthProps> = () => {
  const [url, setURL] = React.useState<string>("");
  const [query, setQuery] = React.useState<string>("");
  const router = useRouter();
  const { data: countData } = useSWR<{ count: number }>("/api/bookmark/count", fetcher);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [chatInput, setChatInput] = React.useState("");
  const isLoading = status === "streaming" || status === "submitted";
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    sendMessage({ text: chatInput });
    setChatInput("");
  };

  const [isCreatingBookmark, setIsCreatingBookmark] = React.useState(false);
  const [searchKey, setSearchKey] = React.useState<string | null>(null);
  const { data: searchData, isLoading: isSearching } = useSWR(
    searchKey ? `/api/bookmark/search?query=${encodeURIComponent(searchKey)}` : null,
    fetcher
  );

  const handleCreateBookmarkSubmit = async (trimmedUrl: string) => {
    setIsCreatingBookmark(true);
    try {
      await createBookmark({ url: trimmedUrl });
      toast.success("Bookmark created successfully!");
      setURL("");
      mutate("/api/bookmark/count");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create bookmark";
      if (message === "Bookmark already exists") {
        toast.error("This bookmark already exists!");
      } else {
        toast.error(`Failed to create bookmark: ${message}`);
      }
    } finally {
      setIsCreatingBookmark(false);
    }
  };

  const handleSearchBookMark = () => {
    if (!query.trim()) {
      toast.warning("Please enter a search query");
      return;
    }
    setSearchKey(query.trim());
  };

  const handleCreateBookmark = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.warning("Please enter a valid URL");
      return;
    }
    // Basic URL validation
    try {
      new URL(
        trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`
      );
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    handleCreateBookmarkSubmit(trimmedUrl);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/auth/login");
    } catch {
      toast.error("Failed to logout");
    }
  };

  // Handle keyboard events
  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateBookmark();
    }
  };

  const handleQueryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchBookMark();
    }
  };


  return (
    <AppLayout>
      <div
        className={cn(
          "fixed inset-4 md:inset-6 grid grid-cols-12 border border-dashed overflow-hidden bg-background rounded-xl"
        )}
      >
        <div className="col-span-12 md:col-span-4 flex flex-col border-r border-dashed divide-y divide-dashed">
          <div className="h-10 items-center flex p-2 justify-between">
            <ThemeSwitcher />
            <button
              onClick={handleLogout}
              className="text-xs flex items-center gap-1 px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
            >
              <RiLogoutBoxLine size={16} />
              Logout
            </button>
          </div>

          {/* Create Bookmark Section */}
          <div className="p-4  grid gap-4 w-full">
            <div className="flex items-center gap-2 text-sm">
              <RiLink size={18} className="text-neutral-500" />
              <p className="font-medium">Create Bookmark</p>
            </div>
            <TextField
              value={url}
              onChange={(value) => setURL(value)}
              onKeyDown={handleUrlKeyDown}
              isDisabled={isCreatingBookmark}
            >
              <Input placeholder="www.example.com" />
            </TextField>
            <Button
              onClick={handleCreateBookmark}
              isDisabled={!url.trim() || isCreatingBookmark}
            >
              Create Bookmark
            </Button>
          </div>

          {/* Search Section */}
          <div className="p-4   border-b border-dashed grid gap-4 w-full">
            <div className="flex items-center gap-2 text-sm">
              <RiSearch2Line size={18} className="text-neutral-500" />
              <p className="font-medium">Search Knowledge Graph</p>
            </div>
            <TextField
              value={query}
              onChange={(value) => setQuery(value)}
              onKeyDown={handleQueryKeyDown}
              isDisabled={isSearching}
            >
              <Input placeholder="The best UI Library" />
            </TextField>
            <Button
              onClick={handleSearchBookMark}
              isDisabled={isSearching || !query.trim()}
            >
              Search Bookmarks
            </Button>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center h-10 p-2 px-4 border-b border-dashed flex-shrink-0">
              {query ? (
                <p className="text-sm text-neutral-500 truncate">
                  Results for &quot;{query}&quot;
                </p>
              ) : (
                <p className="text-sm text-neutral-500">
                  Search Results
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-dashed">
              {(searchData?.hits as SearchHit[])?.map((hit) => (
                <div key={hit._id} className="p-4 group flex items-center justify-between shrink-0">
                  <Link
                    target="_blank"
                    href={hit.fields.url}
                    className="font-medium text-sm text-muted-fg hover:text-primary ease-in-out duration-200 line-clamp-1 break-all"
                  >
                    {hit.fields.title}
                  </Link>
                  <RiExternalLinkLine
                    size={15}
                    className="hidden group-hover:block flex-shrink-0 ml-2"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="col-span-12 md:col-span-8 flex flex-col min-h-0 divide-y divide-dashed">
          <div className="flex flex-col h-full overflow-hidden">
            <ReactLenis root={false} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-fg space-y-3">
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                    <RiSearch2Line size={24} />
                  </div>
                  <p className="text-sm">Ask me anything about your bookmarks...</p>
                  <p className="text-xs text-muted-fg/60">{countData?.count ?? 0} bookmarks in the system</p>
                </div>
              )}
              {messages.map((message) => {
                const isThinking =
                  message.role === "assistant" &&
                  isLoading &&
                  messages[messages.length - 1]?.id === message.id &&
                  (!message.parts.length ||
                    (message.parts.length === 1 &&
                      message.parts[0].type === "text" &&
                      !message.parts[0].text));

                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"
                      } ${isThinking ? "items-center" : "items-start"} mb-4`}
                  >
                    {message.role === "assistant" && (
                      <div className={`flex-shrink-0 mr-2 ${isThinking ? "" : "mt-1"}`}>
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                          <IconStar size="16px" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl   corner-squircle max-w-[85%] text-sm ${message.role === "assistant"
                        ? isThinking
                          ? ""
                          : "bg-muted"
                        : "bg-primary text-primary-fg"
                        }`}
                    >
                      {isThinking && (
                        <div className="py-2 text-primary">
                          <Mirage size="30" speed="2.5" color="currentColor" />
                        </div>
                      )}
                      {message.parts.map((part, idx) => {
                        if (part.type === "text") {
                          return (
                            <div key={idx} className="prose dark:prose-invert prose-sm max-w-none">
                              <Markdown shikiTheme={themes}>{part.text}</Markdown>
                            </div>
                          );
                        }
                        if (part.type === "tool-call") {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const toolPart = part as any;
                          const toolCallId = toolPart.toolCallId || toolPart.id;
                          const toolName = toolPart.toolName || toolPart.name;
                          const toolArgs = toolPart.args;

                          return (
                            <div key={toolCallId} className="flex items-center gap-2 text-xs text-muted-fg my-2">
                              <IconTool size="16" />
                              <span className="font-medium">{TOOL_DISPLAY_NAMES[toolName] || toolName}</span>
                              <span className="opacity-50 text-[10px] font-mono truncate max-w-[200px]">
                                {JSON.stringify(toolArgs)}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex flex-col items-start">
                  <div className="px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm bg-white dark:bg-neutral-800 border">
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <RiSearch2Line size={10} />
                      </div>
                      <span className="text-xs font-medium">AI Assistant</span>
                    </div>
                    <div className="py-2 text-foreground">
                      <Mirage size="60" speed="2.5" color="currentColor" />
                    </div>

                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </ReactLenis>
            <form
              onSubmit={handleChatSubmit}
              className="shrink-0 p-4 border-t border-dashed bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50"
            >
              <div className="relative flex gap-2 items-end max-w-3xl mx-auto w-full">
                <div className="flex-1">
                  <TextField
                    value={chatInput}
                    onChange={(value) => setChatInput(value)}
                    isDisabled={isLoading}
                  >
                    <Input placeholder="Ask a question..." className="w-full shadow-sm" />
                  </TextField>
                </div>
                <Button type="submit" isDisabled={isLoading || !chatInput.trim()} className="shadow-sm">
                  {isLoading ? (
                    <RiLoader2Fill className="animate-spin" size={18} />
                  ) : "Send"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout >
  );
};

export const getServerSideProps = withAuth();

export default HomePage;

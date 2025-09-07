import * as React from "react";
import {
  RiExternalLinkLine,
  RiLink,
  RiLoader2Fill,
  RiSearch2Line
} from "@remixicon/react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/layouts/app-layout";
import { toast } from "sonner";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
interface BookmarkFields {
  url: string;
  title: string;
}

interface SearchHit {
  _id: string;
  _score: number;
  fields: BookmarkFields;
}
const HomePage: React.FC = () => {
  const [url, setURL] = React.useState<string>("");
  const [query, setQuery] = React.useState<string>("");
  const [searchTrigger, setSearchTrigger] = React.useState<string>(""); // Add search trigger state

  const bookmark = trpc.bookmark.insert.useMutation({
    onSuccess: () => {
      toast.success("Bookmark created successfully!");
      setURL(""); // Clear the input after successful creation
    },
    onError: (error) => {
      toast.error(`Failed to create bookmark: ${error.message}`);
    },
  });

  // Fix: Use searchTrigger instead of query for enabled condition
  const search = trpc.bookmark.search.useQuery(
    { query: searchTrigger }, // Use searchTrigger instead of query.trim()
    {
      enabled: Boolean(searchTrigger.trim()), // Enable when searchTrigger has value
    },
  );

  const handleSearchBookMark = () => {
    if (!query.trim()) {
      toast.warning("Please enter a search query");
      return;
    }

    // Set the search trigger to initiate the search
    setSearchTrigger(query.trim());
    // Don't clear the query immediately - let user see what they searched for
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
        trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`,
      );
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    bookmark.mutate({ url: trimmedUrl });
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
          "h-[95vh] my-auto grid grid-cols-12  border m-5 border-dashed",
        )}
      >
        <div className="col-span-12 md:col-span-4 flex flex-col border-r border-dashed divide-y divide-dashed">
          <div className="h-10 items-center flex p-2">
            <ThemeSwitcher />
          </div>

          {/* Create Bookmark Section */}
          <div className="p-4  grid gap-4 w-full">
            <div className="flex items-center gap-2 text-sm">
              <RiLink size={18} className="text-neutral-500" />
              <p className="font-medium">Create Bookmark</p>
            </div>
            <TextField
              value={url}
              onChange={(e) => setURL(e)}
              placeholder="www.example.com"
              onKeyDown={handleUrlKeyDown}
              isDisabled={bookmark.isPending}
            />
            <Button
              onClick={handleCreateBookmark}
              isDisabled={!url.trim() || bookmark.isPending}
            >
              {bookmark.isPending ? (
                <>
                  <RiLoader2Fill className="animate-spin mr-2" size={16} />
                  Creating...
                </>
              ) : (
                "Create Bookmark"
              )}
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
              onChange={(e) => setQuery(e)}
              placeholder="The best UI Library"
              onKeyDown={handleQueryKeyDown}
              isDisabled={search.isLoading}
            />
            <Button
              onClick={handleSearchBookMark}
              isDisabled={search.isLoading || !query.trim()}
            >
              {search.isLoading ? (
                <>
                  <RiLoader2Fill className="animate-spin mr-2" size={16} />
                  Searching...
                </>
              ) : (
                "Search Bookmarks"
              )}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        <div className="col-span-12 md:col-span-8 flex flex-col  divide-y divide-dashed">
          <div className="flex items-center h-10 p-4">
            {query && (
              <p className="text-sm text-neutral-500">
                Showing results for {query}
              </p>
            )}
          </div>
          <div className="flex divide-y flex-col divide-dashed">
            {(search?.data?.hits as SearchHit[])
              ?.filter((hit) => hit._score != 0)
              .map((hit) => (
                <div key={hit._id} className="p-4 group flex justify-between">
                  <Link
                    target="_blank"
                    href={hit.fields.url}
                    className="font-medium text-sm text-muted-fg hover:text-primary ease-in-out duration-200"
                  >
                    {hit.fields.title}
                  </Link>
                  <RiExternalLinkLine
                    size={15}
                    className=" hidden group-hover:block"
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;

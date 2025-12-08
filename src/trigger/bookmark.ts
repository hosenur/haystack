import { firecrawl } from "@/lib/firecrawl";
import { pc } from "@/lib/pinecone";
import { task } from "@trigger.dev/sdk/v3";
import { createId } from "@paralleldrive/cuid2";
export const bookmark = task({
  id: "bookmark",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: { url: string }, { }) => {
    const namespace = pc
      .index("sites", "https://sites-x79hrwo.svc.aped-4627-b74a.pinecone.io")
      .namespace("__default__");

    const doc = await firecrawl.scrape(payload.url, {
      formats: ["markdown"],
    });

    await namespace.upsertRecords([
      {
        id: createId(),
        text: doc.markdown || "",
        url: payload.url,
        title: doc.metadata?.title || "Untitled",
      },
    ]);

    return {
      message: "Hello, world!",
    };
  },
});

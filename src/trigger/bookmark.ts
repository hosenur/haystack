import { firecrawl } from "@/lib/firecrawl";
import { pc } from "@/lib/pinecone";
import { task } from "@trigger.dev/sdk/v3";
import z from "zod";
import { createId } from "@paralleldrive/cuid2";
const schema = z.object({
  title: z.string(),
  description: z.string(),
});
export const bookmark = task({
  id: "bookmark",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: { url: string }, {}) => {
    const namespace = pc
      .index("sites", "https://sites-x79hrwo.svc.aped-4627-b74a.pinecone.io")
      .namespace("__default__");

    const doc = await firecrawl.scrape(payload.url, {
      formats: [
        {
          type: "json",
          prompt:
            "Analyze the content of the page and figure out what content of the site is about,  and give it as description, also fetch the title ",
        },
      ],
    });
    console.log(doc.json);
    const result = schema.parse(doc.json);
    await namespace.upsertRecords([
      {
        id: createId(),
        text: result.description,
        url: payload.url,
        title: result.title,
      },
    ]);

    return {
      message: "Hello, world!",
    };
  },
});

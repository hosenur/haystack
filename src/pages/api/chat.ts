
import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { pc } from "@/lib/pinecone";
import { tasks } from "@trigger.dev/sdk/v3";
import { bookmark } from "../../trigger/bookmark";
import type { NextApiRequest, NextApiResponse } from "next";

const searchBookmarks = tool({
    description: "Search through the user's bookmarks for relevant content",
    inputSchema: z.object({
        query: z.string().describe("The search query to find relevant bookmarks"),
    }),
    execute: async ({ query }: { query: string }) => {
        console.log(`Invoked searchBookmarks with query: ${query}`);
        try {
            const namespace = pc
                .index("sites", "https://sites-x79hrwo.svc.aped-4627-b74a.pinecone.io")
                .namespace("__default__");

            const { result } = await namespace.searchRecords({
                query: {
                    topK: 5,
                    inputs: { text: query },
                },
            });

            return result.hits.map((hit) => {
                const fields = hit.fields as { title: string; url: string; text: string };
                return {
                    title: fields.title,
                    url: fields.url,
                    content: fields.text,
                    score: hit._score,
                };
            });
        } catch (error) {
            console.error("Pinecone search error:", error);
            return { error: "Failed to search bookmarks" };
        }
    },
});

const createBookmark = tool({
    description: "Create a new bookmark for a given URL",
    inputSchema: z.object({
        url: z.string().describe("The URL to bookmark"),
    }),
    execute: async ({ url }: { url: string }) => {
        console.log(`Invoked createBookmark with url: ${url}`);
        try {
            const handle = await tasks.trigger<typeof bookmark>("bookmark", { url });
            return {
                success: true,
                handle,
                message: "Bookmark creation triggered successfully",
            };
        } catch (error) {
            console.error("Trigger bookmark error:", error);
            return { error: "Failed to trigger bookmark creation" };
        }
    },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
    }

    try {
        const result = streamText({
            model: groq("openai/gpt-oss-120b"),
            messages: await convertToModelMessages(messages),
            system: "You are a helpful assistant. You must always try to search the user's bookmarks first using the `searchBookmarks` tool to find relevant information. Only if you cannot find the answer in the bookmarks should you generate an answer from your own knowledge.",
            tools: {
                searchBookmarks,
                createBookmark
            },
            stopWhen: stepCountIs(5),
        });

        result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
        console.error("Chat API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

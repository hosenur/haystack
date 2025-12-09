
import { chat, toolDefinition, toStreamResponse } from "@tanstack/ai";
import { openai } from "@tanstack/ai-openai";
import { z } from "zod";
import { pc } from "@/lib/pinecone";
import { firecrawl } from "@/lib/firecrawl";
import { tasks } from "@trigger.dev/sdk/v3";
import { bookmark } from "../../trigger/bookmark";
import type { NextApiRequest, NextApiResponse } from "next";

const searchBookmarks = toolDefinition({
    name: "searchBookmarks",
    description: "Search through the user's bookmarks for relevant content",
    inputSchema: z.object({
        query: z.string().describe("The search query to find relevant bookmarks"),
    }),
}).server(async ({ query }) => {
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
});

const webSearch = toolDefinition({
    name: "webSearch",
    description: "Fetch and read the content of a specific URL",
    inputSchema: z.object({
        url: z.string().describe("The URL to fetch content from"),
    }),
}).server(async ({ url }) => {
    console.log(`Invoked webSearch with url: ${url}`);
    try {
        const doc = await firecrawl.scrape(url, {
            formats: ["markdown"],
        });
        return {
            title: doc.metadata?.title || "Untitled",
            content: doc.markdown || "No content found",
        };
    } catch (error) {
        console.error("Firecrawl scrape error:", error);
        return { error: "Failed to fetch URL content" };
    }
});

const createBookmark = toolDefinition({
    name: "createBookmark",
    description: "Create a new bookmark for a given URL",
    inputSchema: z.object({
        url: z.string().describe("The URL to bookmark"),
    }),
}).server(async ({ url }) => {
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
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { messages } = req.body;

    const messagesWithSystem = [
        {
            role: "system",
            content: "You are a helpful assistant. You must always try to search the user's bookmarks first using the `searchBookmarks` tool to find relevant information. Only if you cannot find the answer in the bookmarks should you generate an answer from your own knowledge."
        },
        ...messages
    ];

    try {
        const stream = chat({
            adapter: openai({}),
            model: "gpt-4o",
            messages: messagesWithSystem,
            tools: [searchBookmarks, webSearch, createBookmark],
        });

        const response = toStreamResponse(stream);

        // Set headers
        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        res.status(response.status);

        if (response.body) {
            const reader = response.body.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
            } finally {
                reader.releaseLock();
            }
        }

        res.end();
    } catch (error) {
        console.error("Chat API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

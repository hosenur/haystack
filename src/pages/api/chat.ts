
import { chat, toolDefinition, toStreamResponse } from "@tanstack/ai";
import { openai } from "@tanstack/ai-openai";
import { z } from "zod";
import { pc } from "@/lib/pinecone";

export const config = {
    runtime: "edge",
};

const searchBookmarks = toolDefinition({
    name: "searchBookmarks",
    description: "Search through the user's bookmarks for relevant content",
    inputSchema: z.object({
        query: z.string().describe("The search query to find relevant bookmarks"),
    }),
}).server(async ({ query }) => {
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

export default async function handler(req: Request) {
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const { messages } = await req.json();

    const stream = chat({
        adapter: openai({}),
        model: "gpt-4o",
        messages,
        tools: [searchBookmarks],
    });

    return toStreamResponse(stream);
}

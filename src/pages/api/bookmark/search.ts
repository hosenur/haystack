import { z } from "zod";
import { pc } from "@/lib/pinecone";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "@/lib/auth-utils";

const schema = z.object({
    query: z.string().min(2).max(100),
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Auth check
    const session = await getServerSession();

    if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const input = schema.parse(req.query);

        const namespace = pc
            .index("sites", "https://sites-x79hrwo.svc.aped-4627-b74a.pinecone.io")
            .namespace("__default__");

        const { result } = await namespace.searchRecords({
            query: {
                topK: 10,
                inputs: { text: input.query },
            },
        });

        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        console.error("Search error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

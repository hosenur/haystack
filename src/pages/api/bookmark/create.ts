import { z } from "zod";
import { tasks } from "@trigger.dev/sdk";
import type { bookmark } from "@/trigger/bookmark";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { cleanUrl } from "@/lib/url";

const schema = z.object({
    url: z.string().url(),
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const session = await getServerSession(req);

    if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const input = schema.parse(req.body);
        const url = cleanUrl(input.url);

        const existing = await prisma.bookmark.findUnique({
            where: { url },
        });

        if (existing) {
            return res.status(409).json({ error: "Bookmark already exists" });
        }

        await prisma.bookmark.create({
            data: { url },
        });

        const handle = await tasks.trigger<typeof bookmark>("bookmark", {
            url,
        });

        return res.status(200).json(handle);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        console.error("Bookmark creation error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

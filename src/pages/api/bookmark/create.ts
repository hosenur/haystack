import { z } from "zod";
import { tasks } from "@trigger.dev/sdk";
import type { bookmark } from "@/trigger/bookmark";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession, parseCookies, createAuthCookies } from "@/lib/auth-utils";

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

    // Auth check
    const cookies = parseCookies(req.headers.cookie);
    const session = await getServerSession(cookies);

    if (!session?.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Update cookies if refreshed
    if (session.tokens) {
        res.setHeader("Set-Cookie", createAuthCookies(
            session.tokens.access,
            session.tokens.refresh
        ));
    }

    try {
        const input = schema.parse(req.body);

        const handle = await tasks.trigger<typeof bookmark>("bookmark", {
            url: input.url,
        });

        console.log(handle);
        return res.status(200).json(handle);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        console.error("Bookmark creation error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

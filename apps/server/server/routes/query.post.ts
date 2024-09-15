import { z } from "zod";
import { client } from "~~/utils/chroma";

const bodySchema = z.object({
    query: z.string(),
})
export default defineEventHandler(async (event) => {
    const collection = await client.getOrCreateCollection({ name: 'haystack' })
    const body = await readBody(event)
    const parsedBody = bodySchema.safeParse(body)
    if (!parsedBody.success) {
        return new Response(parsedBody.error.message, { status: 400 })
    }
    const { query } = parsedBody.data
    const results = await collection.query({
        queryTexts: [query],
        nResults: 1,
    })
    return { results }
})
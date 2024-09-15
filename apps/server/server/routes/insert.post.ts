import { z } from "zod";
import { client } from "~~/utils/chroma";

const bodySchema = z.object({
    document: z.string(),
    id: z.string(),
})
export default defineEventHandler(async (event) => {
    const collection = await client.getOrCreateCollection({ name: 'haystack' })
    const body = await readBody(event)
    const parsedBody = bodySchema.safeParse(body)
    if (!parsedBody.success) {
        return new Response(parsedBody.error.message, { status: 400 })
    }
    const { document, id } = parsedBody.data
    await collection.add({
        ids: [id],
        documents: [document],
    })
    return { hello: 'API' }
})
import { createHistoryValidator } from '#validators/history'
import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { client } from '../../utils/chroma.js'
const collection = await client.getOrCreateCollection({
    name: 'history',
})
type FinalData = {
    documents: string[],
    ids: string[],
    metadatas: {
        url: string,
        title: string,
    }[]
}
export default class HistoriesController {
    async store({ request }: HttpContext) {
        const payload = await createHistoryValidator.validate(request.body())
        const ids = payload.map(item => item.id)
        const titles = payload.map(item => item.title)
        const urls = payload.map(item => item.url)
        const descriptions = await Promise.all(urls.map(getMetaDescription))
        const docuemnts = titles.map((title, index) => `${title} ${descriptions[index]}`)
        const data: FinalData = {
            documents: docuemnts,
            ids,
            metadatas: payload.map(item => ({ url: item.url, title: item.title }))
        }
        await collection.add({ documents: docuemnts, ids: data.ids, metadatas: data.metadatas })

    }
}

async function getMetaDescription(url: string) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const metaDescription = $('meta[name="description"]').attr('content');
        return metaDescription || "No meta description found";
    } catch (error) {
        return null;
    }
}
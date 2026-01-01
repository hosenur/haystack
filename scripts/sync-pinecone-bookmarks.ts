import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { prisma } from "../src/lib/prisma";
import { cleanUrl } from "../src/lib/url";

async function main() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not set");
  }

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index("sites", "https://sites-x79hrwo.svc.aped-4627-b74a.pinecone.io");

  console.log("Fetching records from Pinecone...");

  let created = 0;
  let skipped = 0;
  let paginationToken: string | undefined;

  const ns = index.namespace("__default__");

  do {
    const response = await ns.listPaginated({ 
      paginationToken,
      prefix: "",
    });

    if (!response.vectors?.length) break;

    const ids = response.vectors.map(v => v.id).filter((id): id is string => !!id);
    const fetched = await ns.fetch(ids);

    for (const [, record] of Object.entries(fetched.records)) {
      if (!record?.metadata?.url) continue;

      const url = cleanUrl(record.metadata.url as string);
      const title = record.metadata.title as string | undefined;

      try {
        const existing = await prisma.bookmark.findUnique({ where: { url } });

        if (existing) {
          console.log(`Skipping (exists): ${url}`);
          skipped++;
          continue;
        }

        await prisma.bookmark.create({
          data: { url, title },
        });
        console.log(`Created: ${url}`);
        created++;
      } catch (error) {
        console.error(`Error processing ${url}:`, error);
      }
    }

    paginationToken = response.pagination?.next;
  } while (paginationToken);

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
}

main().catch(console.error);

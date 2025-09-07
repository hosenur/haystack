import { Pinecone } from "@pinecone-database/pinecone";
if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is not set");
}
export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

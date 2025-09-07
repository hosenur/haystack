import { pc } from "@/lib/pinecone";
import { createId } from "@paralleldrive/cuid2";

const namespace = pc
  .index("sites", "https://sites-x79hrwo.svc.aped-4627-b74a.pinecone.io")
  .namespace("__default__");

await namespace.upsertRecords([
  {
    id: createId(),
    text: "hi",
    url: "hi"
    
  },
]);

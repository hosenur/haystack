import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { tasks } from "@trigger.dev/sdk";
import type { bookmark } from "@/trigger/bookmark";
import { pc } from "@/lib/pinecone";

export const bookmarkRouter = createTRPCRouter({
  insert: publicProcedure
    .input(
      z.object({
        url: z.url(),
      })
    )
    .mutation(async ({ input }) => {
      const handle = await tasks.trigger<typeof bookmark>("bookmark", {
        url: input.url,
      });
      console.log(handle);
      return Response.json(handle);
    }),
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(2).max(100),
      })
    )
    .query(async ({ input }) => {
      const namespace = pc
        .index("sites", "https://sites-x79hrwo.svc.aped-4627-b74a.pinecone.io")
        .namespace("__default__");

      const { result } = await namespace.searchRecords({
        query: {
          topK: 10,
          inputs: { text: input.query },
        },
      });

      return result;
    }),
});

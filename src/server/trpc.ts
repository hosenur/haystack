import { parseCookies, getServerSession, createAuthCookies } from "@/lib/auth-utils";
import { initTRPC, TRPCError } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { z } from "zod";

// Create context for tRPC
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  
  // Parse cookies from request
  const cookies = parseCookies(req.headers.cookie);
  const session = await getServerSession(cookies);

  // If tokens were refreshed, update cookies
  if (session?.tokens) {
    res.setHeader("Set-Cookie", createAuthCookies(
      session.tokens.access,
      session.tokens.refresh
    ));
  }

  return {
    req,
    res,
    user: session?.user || null,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof z.ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Export reusable router and procedure helpers
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedures
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

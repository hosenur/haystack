import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingMessage } from "http";
import type { NextApiRequest } from "next";

type RequestWithHeaders = NextApiRequest | IncomingMessage | { headers: Record<string, string | string[] | undefined> };

export async function getServerSession(req: RequestWithHeaders) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return session;
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

export async function getServerUser(req: RequestWithHeaders) {
  const session = await getServerSession(req);
  return session?.user;
}

export async function signOutServer(req: RequestWithHeaders) {
  try {
    await auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
    });
    return true;
  } catch (error) {
    console.error("Sign out error:", error);
    return false;
  }
}

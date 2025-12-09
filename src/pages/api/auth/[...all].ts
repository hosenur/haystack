import type { NextApiRequest, NextApiResponse } from "next";
import { authClient } from "@/lib/auth-client";
import { subjects } from "@/lib/subjects"; // Keep subjects if verified uses it? Yes, verify uses it.
import { parseCookies, createAuthCookies, clearAuthCookies } from "@/lib/auth-utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { all } = req.query;
  const path = Array.isArray(all) ? all.join("/") : all || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 1. Login: Redirect to OpenAuth server
  if (path === "login" && req.method === "GET") {
    try {
      const redirectUri = `${baseUrl}/api/auth/callback`;
      const { url } = await authClient.authorize(redirectUri, "code");

      // Store redirect URI for verification in callback
      res.setHeader("Set-Cookie", `oauth_redirect_uri=${redirectUri}; Path=/; HttpOnly; SameSite=Lax`);
      res.redirect(302, url);
      return;
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error during login" });
      return;
    }
  }

  // 2. Callback: Exchange code for tokens
  if (path === "callback" && req.method === "GET") {
    const { code } = req.query;
    if (code && typeof code === "string") {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const storedRedirectUri = cookies.oauth_redirect_uri;
        const redirectUri = storedRedirectUri || `${baseUrl}/api/auth/callback`;

        const exchanged = await authClient.exchange(code, redirectUri);

        if (exchanged.err) {
          console.error("Exchange error:", exchanged.err);
          res.status(401).json({ error: "Invalid authorization code" });
          return;
        }

        const { access, refresh } = exchanged.tokens;
        const authCookies = createAuthCookies(access, refresh);
        const clearRedirectCookie = "oauth_redirect_uri=; Path=/; HttpOnly; Max-Age=0";

        res.setHeader("Set-Cookie", [...authCookies, clearRedirectCookie]);
        res.redirect(302, "/");
        return;
      } catch (error) {
        console.error("OAuth callback error:", error);
        res.status(500).json({ error: "Internal server error" });
        return;
      }
    }
  }

  // 3. Logout: Clear session
  if (path === "logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", clearAuthCookies());
    res.status(200).json({ success: true });
    return;
  }

  // 4. Session: Verify current session (optional helper)
  if (path === "session" && req.method === "GET") {
    const cookies = parseCookies(req.headers.cookie);
    const accessToken = cookies.access_token;
    const refreshToken = cookies.refresh_token;

    if (!accessToken) {
      res.status(401).json({ error: "No session" });
      return;
    }

    try {
      const verified = await authClient.verify(subjects, accessToken, {
        refresh: refreshToken,
      });

      if (verified.err) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }

      if (verified.tokens) {
        res.setHeader("Set-Cookie", createAuthCookies(
          verified.tokens.access,
          verified.tokens.refresh
        ));
      }

      res.status(200).json({
        user: verified.subject.properties,
      });
      return;
    } catch (error) {
      console.error("Session verification error:", error);
      res.status(401).json({ error: "Invalid session" });
      return;
    }
  }

  res.status(404).json({ error: "Not found" });
}
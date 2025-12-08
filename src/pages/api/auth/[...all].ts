import type { NextApiRequest, NextApiResponse } from "next";
import { authClient } from "@/lib/auth-client";
import { subjects } from "@/lib/subjects";
import { parseCookies, createAuthCookies, clearAuthCookies } from "@/lib/auth-utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { all } = req.query;
  const path = Array.isArray(all) ? all.join("/") : all || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle OAuth callback - accepts any path with a code parameter
  // This handles both /api/auth/callback and /api/auth/<uuid> patterns
  const { code } = req.query;
  if (code && typeof code === "string" && req.method === "GET") {
    try {
      // Get the stored redirect URI from cookie, or reconstruct from current path
      const cookies = parseCookies(req.headers.cookie);
      const storedRedirectUri = cookies.oauth_redirect_uri;
      
      // Use stored redirect URI, or construct from current request path
      const redirectUri = storedRedirectUri || `${baseUrl}/api/auth/${path}`;
      
      console.log("=== OAuth Callback Debug ===");
      console.log("Code:", code);
      console.log("Stored redirect URI from cookie:", storedRedirectUri);
      console.log("Final redirect URI:", redirectUri);
      
      const exchanged = await authClient.exchange(code, redirectUri);

      if (exchanged.err) {
        console.error("Exchange error:", exchanged.err);
        // Try to get more details by making a manual request
        const debugResponse = await fetch("https://auth.hosenur.cloud/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            client_id: "haystack-web",
            code_verifier: "",
          }).toString(),
        });
        const debugJson = await debugResponse.json();
        console.error("Token endpoint response:", debugJson);
        return res.status(401).json({ error: "Invalid authorization code", details: debugJson });
      }

      const { access, refresh } = exchanged.tokens;

      // Set HTTP-only cookies and clear the oauth_redirect_uri cookie
      const authCookies = createAuthCookies(access, refresh);
      const clearRedirectCookie = "oauth_redirect_uri=; Path=/; HttpOnly; Max-Age=0";
      res.setHeader("Set-Cookie", [...authCookies, clearRedirectCookie]);

      // Redirect to home page (always go to home after successful login)
      return res.redirect(302, "/");
    } catch (error) {
      console.error("OAuth callback error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Handle logout
  if (path === "logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", clearAuthCookies());
    return res.status(200).json({ success: true });
  }

  // Handle session verification
  if (path === "session" && req.method === "GET") {
    const cookies = parseCookies(req.headers.cookie);
    const accessToken = cookies.access_token;
    const refreshToken = cookies.refresh_token;

    if (!accessToken) {
      return res.status(401).json({ error: "No session" });
    }

    try {
      const verified = await authClient.verify(subjects, accessToken, {
        refresh: refreshToken,
      });

      if (verified.err) {
        return res.status(401).json({ error: "Invalid session" });
      }

      // If tokens were refreshed, update cookies
      if (verified.tokens) {
        res.setHeader("Set-Cookie", createAuthCookies(
          verified.tokens.access,
          verified.tokens.refresh
        ));
      }

      return res.status(200).json({
        user: verified.subject.properties,
      });
    } catch (error) {
      console.error("Session verification error:", error);
      return res.status(401).json({ error: "Invalid session" });
    }
  }

  return res.status(404).json({ error: "Not found" });
}
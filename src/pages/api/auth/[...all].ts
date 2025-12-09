import type { NextApiRequest, NextApiResponse } from "next";
import { authClient } from "@/lib/auth-client";
import { subjects } from "@/lib/subjects";
import { parseCookies, createAuthCookies, clearAuthCookies } from "@/lib/auth-utils";
import { issuer } from "@openauthjs/openauth";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { CodeUI } from "@openauthjs/openauth/ui/code";

// Initialize OpenAuth Server
const authServer = issuer({
  subjects,
  storage: MemoryStorage(),
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email, code) => {
          console.log(`[OpenAuth] Sending code to ${email}: ${code}`);
          // TODO: Implement actual email sending (e.g. Resend)
        },
      })
    ),
  },
  success: async (ctx, value) => {
    if (value.provider === "code") {
      return ctx.subject("user", { id: value.claims.email });
    }
    throw new Error("Invalid provider");
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { all } = req.query;
  const path = Array.isArray(all) ? all.join("/") : all || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // --- CLIENT LOGIC START ---
  // Handle OAuth callback - accepts any path with a code parameter
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
        res.status(401).json({ error: "Invalid authorization code" });
        return;
      }

      const { access, refresh } = exchanged.tokens;

      // Set HTTP-only cookies and clear the oauth_redirect_uri cookie
      const authCookies = createAuthCookies(access, refresh);
      const clearRedirectCookie = "oauth_redirect_uri=; Path=/; HttpOnly; Max-Age=0";
      res.setHeader("Set-Cookie", [...authCookies, clearRedirectCookie]);

      // Redirect to home page
      res.redirect(302, "/");
      return;
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }

  // Handle logout
  if (path === "logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", clearAuthCookies());
    res.status(200).json({ success: true });
    return;
  }

  // Handle session verification
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
  // --- CLIENT LOGIC END ---

  // --- SERVER LOGIC START ---
  // If no client route matched, pass to OpenAuth Server
  try {
    const webReq = await toWebRequest(req);
    const response = await authServer.fetch(webReq);

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.status(response.status);
    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error("Auth Server Error:", error);
    res.status(500).json({ error: "Internal Auth Server Error" });
  }
}

// Helper to convert NextApiRequest to Web Request
async function toWebRequest(req: NextApiRequest): Promise<Request> {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["host"] || "localhost:3000";
  const url = `${protocol}://${host}${req.url}`;

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => headers.append(key, v));
    } else if (value) {
      headers.append(key, value);
    }
  });

  const options: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers['content-type'] || '';
    if (req.body && typeof req.body === 'object') {
      if (contentType.includes('application/x-www-form-urlencoded')) {
        options.body = new URLSearchParams(req.body).toString();
      } else {
        options.body = JSON.stringify(req.body);
      }
    } else {
      options.body = req.body;
    }
  }

  return new Request(url, options);
}
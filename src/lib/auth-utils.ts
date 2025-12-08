import { authClient } from "./auth-client";
import { subjects } from "./subjects";

/**
 * Helper to get the current user session on the server side
 * Usage in API routes or getServerSideProps
 */
export async function getServerSession(cookies: Record<string, string>) {
  const accessToken = cookies.access_token;
  const refreshToken = cookies.refresh_token;

  console.log("=== getServerSession Debug ===");
  console.log("access_token present:", !!accessToken);
  console.log("access_token length:", accessToken?.length);
  console.log("refresh_token present:", !!refreshToken);

  if (!accessToken) {
    console.log("No access token, returning null");
    return null;
  }

  try {
    const verified = await authClient.verify(subjects, accessToken, {
      refresh: refreshToken,
    });

    console.log("Verify result - err:", verified.err);
    if (!verified.err) {
      console.log("Verify result - subject:", verified.subject);
    }

    if (verified.err) {
      console.log("Verification failed, returning null");
      return null;
    }

    return {
      user: verified.subject.properties,
      tokens: verified.tokens, // Will be defined if tokens were refreshed
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

/**
 * Helper to parse cookies from request headers
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  
  return cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, ...valueParts] = cookie.trim().split("=");
    const value = valueParts.join("="); // Handle values that contain '='
    if (key && value) {
      // Decode URL-encoded cookie values
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
    }
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Helper to create cookie strings for setting auth tokens
 */
export function createAuthCookies(access: string, refresh: string): string[] {
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "Secure; " : "";
  
  return [
    `access_token=${access}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=2592000`,
    `refresh_token=${refresh}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=31536000`,
  ];
}

/**
 * Helper to clear auth cookies
 */
export function clearAuthCookies(): string[] {
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "Secure; " : "";
  
  return [
    `access_token=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
    `refresh_token=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
  ];
}

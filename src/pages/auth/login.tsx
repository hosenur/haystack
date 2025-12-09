import { authClient } from "@/lib/auth-client";
import { GetServerSideProps } from "next";

// This page immediately redirects to OpenAuth server
// Using getServerSideProps to handle the redirect server-side
export const getServerSideProps: GetServerSideProps = async (context) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/callback`;

  // Use the OpenAuth client to get the authorization URL
  const { url } = await authClient.authorize(redirectUri, "code", {
    provider: "code", // OTP provider
  });

  // Store the redirect URI in a cookie so we can use it during token exchange
  // This handles cases where the OAuth server uses a different callback path
  context.res.setHeader("Set-Cookie", [
    `oauth_redirect_uri=${encodeURIComponent(redirectUri)}; Path=/; HttpOnly; Max-Age=600`,
  ]);

  return {
    redirect: {
      destination: url,
      permanent: false,
    },
  };
};

// This component won't render since we redirect in getServerSideProps
export default function LoginPage() {
  return null;
}

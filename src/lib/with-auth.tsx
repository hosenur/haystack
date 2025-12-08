import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getServerSession, parseCookies } from "./auth-utils";

/**
 * Higher-order function to create protected pages
 * Redirects to login if user is not authenticated
 */
export function withAuth<P extends Record<string, unknown> = Record<string, unknown>>(
  getServerSidePropsFunc?: GetServerSideProps<P>
): GetServerSideProps<P> {
  return async (context: GetServerSidePropsContext) => {
    const cookies = parseCookies(context.req.headers.cookie);
    const session = await getServerSession(cookies);

    // If no session, redirect to login
    if (!session) {
      return {
        redirect: {
          destination: "/auth/login",
          permanent: false,
        },
      };
    }

    // If tokens were refreshed, update cookies
    if (session.tokens) {
      const { createAuthCookies } = await import("./auth-utils");
      context.res.setHeader(
        "Set-Cookie",
        createAuthCookies(session.tokens.access, session.tokens.refresh)
      );
    }

    // If there's a custom getServerSideProps, call it with the session
    if (getServerSidePropsFunc) {
      const result = await getServerSidePropsFunc(context);
      
      // Merge session into props
      if ("props" in result) {
        return {
          ...result,
          props: {
            ...(await Promise.resolve(result.props)),
            user: session.user,
          },
        };
      }
      
      return result;
    }

    // Default: just return the user
    return {
      props: {
        user: session.user,
      } as unknown as P,
    };
  };
}

/**
 * Higher-order function to create guest-only pages (login, register)
 * Redirects to home if user is already authenticated
 */
export function withGuest<P extends Record<string, unknown> = Record<string, unknown>>(
  getServerSidePropsFunc?: GetServerSideProps<P>
): GetServerSideProps<P> {
  return async (context: GetServerSidePropsContext) => {
    const cookies = parseCookies(context.req.headers.cookie);
    const session = await getServerSession(cookies);

    // If session exists, redirect to home
    if (session) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    // If there's a custom getServerSideProps, call it
    if (getServerSidePropsFunc) {
      return await getServerSidePropsFunc(context);
    }

    // Default: return empty props
    return {
      props: {} as P,
    };
  };
}

/**
 * Type for user prop that gets passed to protected pages
 */
export interface WithAuthProps {
  user: {
    id: string;
  };
}

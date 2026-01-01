import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getServerSession } from "./auth-utils";

type SerializedUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

function serializeUser(user: Record<string, unknown>): SerializedUser {
  return JSON.parse(JSON.stringify(user));
}

export function withAuth<P extends Record<string, unknown> = Record<string, unknown>>(
  getServerSidePropsFunc?: GetServerSideProps<P>
): GetServerSideProps<P> {
  return async (context: GetServerSidePropsContext) => {
    const session = await getServerSession(context.req);

    if (!session) {
      return {
        redirect: {
          destination: "/auth/login",
          permanent: false,
        },
      };
    }

    const user = serializeUser(session.user as Record<string, unknown>);

    if (getServerSidePropsFunc) {
      const result = await getServerSidePropsFunc(context);

      if ("props" in result) {
        return {
          ...result,
          props: {
            ...(await Promise.resolve(result.props)),
            user,
          },
        };
      }

      return result;
    }

    return {
      props: {
        user,
      } as unknown as P,
    };
  };
}

export function withGuest<P extends Record<string, unknown> = Record<string, unknown>>(
  getServerSidePropsFunc?: GetServerSideProps<P>
): GetServerSideProps<P> {
  return async (context: GetServerSidePropsContext) => {
    const session = await getServerSession(context.req);

    if (session) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    if (getServerSidePropsFunc) {
      return await getServerSidePropsFunc(context);
    }

    return {
      props: {} as P,
    };
  };
}

export interface WithAuthProps {
  user: SerializedUser;
}

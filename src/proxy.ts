import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/knowledge-base/:path*",
    "/settings/:path*",
    "/analytics/:path*",
    "/workflow/:path*",
    "/embed-code/:path*",
  ],
};

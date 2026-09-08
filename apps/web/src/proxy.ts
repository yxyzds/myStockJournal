import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextProxy } from "next/server";

function isPublicPath(pathname: string) {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname.startsWith("/api");
}

const withClerk: NextProxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicPath(req.nextUrl.pathname)) {
    await auth.protect();
  }
});

const passthrough: NextProxy = () => NextResponse.next();

export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? withClerk : passthrough;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isUnprotectedRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isUnprotectedRoute(req)) {
      console.log(`clerkMiddleware: PROTECTED -> ${req.nextUrl.pathname}`);
      await auth.protect();
    } else {
      console.log(`clerkMiddleware: UNPROTECTED -> ${req.nextUrl.pathname}`);
    }
  },
  { debug: false },
);

// Also exclude tunnelRoute used in Sentry from the matcher.
// export const config = {
//   matcher: ['/((?!.+\\.[\\w]+$|_next|monitoring).*)', '/', '/(api|trpc)(.*)'],
// };

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};

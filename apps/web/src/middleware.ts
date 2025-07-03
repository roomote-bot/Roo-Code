// import type { NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

const isUnprotectedRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/extension/sign-in(.*)',
  '/api/marketplace(.*)',
  '/share(.*)',
  '/',
]);

const isApiRoute = createRouteMatcher(['/api(.*)']);

const isAgentRequest = (req: NextRequest) => {
  return req.headers.get('authorization')?.startsWith('Bearer ');
};

export default clerkMiddleware(
  async (auth, req) => {
    const isUnprotected =
      isUnprotectedRoute(req) || (isApiRoute(req) && isAgentRequest(req));

    if (!isUnprotected) {
      await auth.protect();
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

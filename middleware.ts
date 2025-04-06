import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // If it's the root path handled by the app router, redirect to the pages router implementation
  // This helps avoid conflicts between the App Router and Pages Router for the same route
  if (pathname === '/') {
    // This will route to pages/index.tsx instead of app/page.tsx
    // We use a query parameter to ensure it routes to the Pages Router
    url.pathname = '/_pages_router';
    url.searchParams.set('from', 'middleware');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: ['/'],
}; 
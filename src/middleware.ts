import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // If the user is trying to access the admin dashboard without a session,
  // redirect them to the login page.
  if (!session && pathname.startsWith('/admin/dashboard')) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // If the user is logged in and tries to access the login page,
  // redirect them to the admin dashboard.
  if (session && pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // The matcher defines the routes where the middleware will run.
  matcher: ['/admin/dashboard/:path*', '/admin/login'],
};

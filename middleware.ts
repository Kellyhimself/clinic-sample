import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a response object that we can modify
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client for the middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Make sure we're setting cookies properly in the response
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Make sure we're removing cookies properly in the response
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  try {
    // Try to get the session
    const { data: { session }, error } = await supabase.auth.getSession();

    // If there was an error getting the session, log it
    if (error) {
      console.error('Error in middleware getting session:', error);
      // Continue with the response
    }

    // Define public paths that don't require authentication
    const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'));

    // If no session and trying to access protected route, redirect to login
    if (!session && !isPublicPath) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // If there's a session and trying to access public path, redirect to dashboard
    if (session && isPublicPath && request.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // For protected routes, check user role
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // Example role-based access control
      if (request.nextUrl.pathname.startsWith('/admin') && profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } catch (err) {
    console.error('Unexpected error in middleware:', err);
  }

  // Return the response we've been building
  return response;
}

// Match all routes except for static files, api routes, etc.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|public).*)',
  ],
}; 
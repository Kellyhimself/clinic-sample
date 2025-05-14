import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkFeatureAccess } from '@/app/lib/actions/features'
import { setTenantContext } from './app/lib/auth/server'

// Define route requirements based on plan types
const ROUTE_REQUIREMENTS = {
  // Free plan routes
  '/appointments': 'free',
  '/inventory': 'free',
  '/pharmacy': 'free',
  '/services': 'free',
  
  // Pro plan routes
  '/analytics': 'pro',
  
  '/settings/users': 'pro',
  '/settings/roles': 'pro',
  
  // Enterprise plan routes
  '/settings/integrations': 'enterprise'
} as const

export async function middleware(request: NextRequest) {
  // Initialize response first
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client with cookie handlers
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get authenticated user securely
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // Define route types
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                    request.nextUrl.pathname.startsWith('/signup')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isPublicPage = request.nextUrl.pathname === '/' || 
                      request.nextUrl.pathname.startsWith('/_next') ||
                      request.nextUrl.pathname.startsWith('/api')

  // Allow public pages
  if (isPublicPage) {
    return response
  }

  if (user && !userError) {
    // Get user's tenant association
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profile?.tenant_id) {
      // Set tenant context in cookie
      response.cookies.set({
        name: 'tenant_id',
        value: profile.tenant_id,
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      // Set tenant context for RLS using the helper function
      await setTenantContext(profile.tenant_id)

      // Set tenant context in request headers
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-tenant-id', profile.tenant_id)
      requestHeaders.set('x-tenant-role', profile.role)

      // Create new response with modified headers
      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })

      // If user is signed in
      if (isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Check admin access
      if (isAdminPage && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Check plan access for the current route
      const currentPath = request.nextUrl.pathname
      for (const [route, requiredPlan] of Object.entries(ROUTE_REQUIREMENTS)) {
        if (currentPath.startsWith(route)) {
          try {
            const hasAccess = await checkFeatureAccess(requiredPlan)
            if (!hasAccess) {
              // Redirect to billing page with a query parameter indicating which plan was blocked
              const redirectUrl = new URL('/settings/billing', request.url)
              redirectUrl.searchParams.set('plan', requiredPlan)
              return NextResponse.redirect(redirectUrl)
            }
          } catch (error) {
            console.error(`Error checking plan access for ${requiredPlan}:`, error)
            // On error, allow access but log the error
            continue
          }
        }
      }

      return response
    }
  } else {
    // If user is not signed in
    if (isDashboardPage || isAdminPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
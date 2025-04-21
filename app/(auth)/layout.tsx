// app/(auth)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { User } from '@supabase/supabase-js';

// Import server actions
import { setAuthCookie, removeAuthCookie } from '@/lib/supabase-server';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('patient');
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
          // Use server action to set auth cookie
          await setAuthCookie('auth-token', session.access_token, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });

          // Get the profile to determine user role
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setIsAuthenticated(true);
          setUser(session.user);
          
          // Set user role from profile if available
          if (profile && profile.role) {
            setUserRole(profile.role);
            console.log("User role set to:", profile.role);
          }

          if (profile) {
            if (pathname === '/login' || pathname === '/signup') {
              router.push('/dashboard');
            }
          } else {
            router.push('/onboarding');
          }
        } else {
          setIsAuthenticated(false);
          if (pathname !== '/login' && pathname !== '/signup') {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsAuthenticated(false);
        // Use server action to remove auth cookie
        await removeAuthCookie('auth-token', {
          path: '/',
        });
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router, supabase, pathname]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If not authenticated and not on a public route, don't render anything
  if (!isAuthenticated && pathname !== '/login' && pathname !== '/signup') {
    return null;
  }

  // If authenticated, wrap with AuthenticatedLayout
  if (isAuthenticated && user) {
    return (
      <AuthenticatedLayout
        handleLogout={async () => {
          await supabase.auth.signOut();
          await removeAuthCookie('auth-token', { path: '/' });
          router.push('/login');
        }}
        userRole={userRole}
        user={user}
      >
        {children}
      </AuthenticatedLayout>
    );
  }

  // For public routes (login/signup)
  return <>{children}</>;
}

export type AuthLayoutProps = {
  userRole: string;
  user?: User;
  profile?: { role: string };
  handleLogout?: () => Promise<void>;
};
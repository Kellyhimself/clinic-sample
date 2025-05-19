'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, ChevronDown, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/auth/client';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [screenSize, setScreenSize] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuthContext();
  const { tenantId } = useTenant();
  const router = useRouter();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Handle responsive sidebar and screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobileView = width < 768;

      // Set screen size bracket
      if (width <= 358) {
        setScreenSize('xs');
      } else if (width >= 359 && width <= 409) {
        setScreenSize('sm');
      } else if (width >= 410 && width <= 480) {
        setScreenSize('md');
      } else {
        setScreenSize('lg');
      }

      setIsMobileView(mobileView);
      if (!mobileView) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track scroll position for menu button style
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle session recovery
  useEffect(() => {
    if (loading && retryCount < 3) {
      const timer = setTimeout(() => {
        setIsRetrying(true);
        // Attempt to refresh the session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setRetryCount(0);
            setIsRetrying(false);
          } else {
            setRetryCount(prev => prev + 1);
            setIsRetrying(false);
          }
        });
      }, 2000 * (retryCount + 1)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [loading, retryCount]);

  // Handle sign-out
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Function to close the sidebar
  const closeSidebar = () => {
    if (isMobileView) {
      setIsSidebarOpen(false);
    }
  };

  // Function to handle manual retry
  const handleRetry = () => {
    setRetryCount(0);
    setIsRetrying(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setRetryCount(0);
        setIsRetrying(false);
      } else {
        setRetryCount(prev => prev + 1);
        setIsRetrying(false);
      }
    });
  };

  const handleMenuClick = () => {
    setIsMenuOpen(prev => !prev);
  };

  // If loading or error, show appropriate state
  if (loading || isRetrying) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Your Dashboard</h2>
          <p className="text-gray-600 max-w-md">
            We're preparing your personalized workspace. This usually takes just a few seconds.
          </p>
        </div>
        {retryCount > 0 && (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              {retryCount === 1 ? "Still loading..." : 
               retryCount === 2 ? "Taking longer than usual..." : 
               "Having trouble connecting..."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>

              
              <Button 
                onClick={async () => {
                  if (user) {
                    await supabase.auth.signOut();
                  }
                  router.push('/login');
                }}
                variant="default"
                className="flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In Again
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    // Only redirect to login if we've exhausted retries
    if (retryCount >= 3) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-6 p-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-semibold text-gray-900">Session Expired</h2>
            <p className="text-gray-600">
              Your session has expired or you&apos;ve been signed out. Please sign in again to continue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button 
                onClick={async () => {
                  if (user) {
                    await supabase.auth.signOut();
                  }
                  router.push('/login');
                }}
                variant="default"
                className="flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In Again
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900">Verifying Your Session</h2>
          <p className="text-gray-600">
            We're checking your login status. This helps keep your account secure.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleRetry}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Verification
            </Button>
            <Button 
              onClick={async () => {
                if (user) {
                  await supabase.auth.signOut();
                }
                router.push('/login');
              }}
              variant="default"
              className="flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar container */}
      <div
        className={cn(
          'bg-gradient-to-b from-blue-100/80 to-teal-100/80 backdrop-blur-sm shadow-lg border-r border-blue-200',
          'transition-all duration-300 ease-in-out h-full',
          isMobileView ? 'fixed top-0 left-0 z-50 w-64' : 'relative w-64',
          isMobileView && !isSidebarOpen && 'transform -translate-x-full',
          screenSize === 'xs' && 'w-56'
        )}
      >
        <Sidebar closeSidebar={closeSidebar} />
        {isMobileView && isSidebarOpen && (
          <Button
            variant="ghost"
            className={cn(
              'absolute top-4 right-4 md:hidden text-blue-600 hover:text-blue-700 hover:bg-blue-200 bg-blue-100 rounded-none',
              screenSize === 'xs' && 'top-2 right-2',
              screenSize === 'sm' && 'top-3 right-3'
            )}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className={cn('w-4 h-4', screenSize === 'xs' && 'w-3 h-3')} />
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out h-full">
        <Navbar 
          screenSize={screenSize} 
          onLogout={handleLogout}
          onMenuClick={handleMenuClick}
          isMenuOpen={isMenuOpen}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isMobileView={isMobileView}
        />
        <main
          className={cn(
            'bg-transparent flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide',
            screenSize === 'xs' ? 'p-2 pt-14' : 
            screenSize === 'sm' ? 'p-3 pt-16' : 
            screenSize === 'md' ? 'p-4 pt-16' : 
            'p-4 sm:p-6 pt-16'
          )}
        >
          <div className="mt-14">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobileView && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
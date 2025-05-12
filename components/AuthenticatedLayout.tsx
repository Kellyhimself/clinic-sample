'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/auth/client';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [screenSize, setScreenSize] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, tenantContext, loading, error } = useAuth();
  const router = useRouter();

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

  // If loading or error, show appropriate state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !user || !tenantContext) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar container */}
      <div
        className={cn(
          'bg-gradient-to-b from-blue-100 to-teal-100 shadow-lg border-r border-blue-200',
          'transition-all duration-300 ease-in-out h-screen',
          isMobileView ? 'fixed top-0 left-0 z-50 w-64' : 'relative w-64',
          isMobileView && !isSidebarOpen && 'transform -translate-x-full',
          screenSize === 'xs' && 'w-56'
        )}
      >
        <Sidebar tenantContext={tenantContext} closeSidebar={closeSidebar} />
        {isMobileView && isSidebarOpen && (
          <Button
            variant="ghost"
            className={cn(
              'absolute top-4 right-4 md:hidden text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-full',
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
      <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        <Navbar 
          screenSize={screenSize} 
          user={user} 
          tenantContext={tenantContext} 
          onLogout={handleLogout} 
        />
        <main
          className={cn(
            'bg-gray-50 flex-1 overflow-y-auto',
            screenSize === 'xs' ? 'p-2' : screenSize === 'sm' ? 'p-3' : screenSize === 'md' ? 'p-4' : 'p-4 sm:p-6'
          )}
        >
          {isMobileView && !isSidebarOpen && (
            <Button
              variant="ghost"
              className={cn(
                'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 rounded-full shadow-md',
                screenSize === 'sm' && 'ml-2',
                screenSize === 'xs' && 'mb-2',
                isScrolled
                  ? 'fixed top-4 left-4 z-50 bg-white shadow-lg transition-all duration-300'
                  : screenSize === 'sm' || screenSize === 'md'
                  ? 'absolute top-[3.6rem] left-3 z-40'
                  : 'mb-4'
              )}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className={cn('w-6 h-6', screenSize === 'xs' && 'w-5 h-5')} />
            </Button>
          )}
          <div
            className={cn(
              (screenSize === 'sm' || screenSize === 'md') && isMobileView && !isSidebarOpen ? 'pt-10' : ''
            )}
          >
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
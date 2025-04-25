// components/AuthenticatedLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  handleLogout: () => Promise<void>;
  userRole: string; 
  user: User;
}

export default function AuthenticatedLayout({
  children,
  handleLogout,
  userRole,
  user,
}: AuthenticatedLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [screenSize, setScreenSize] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Check if mobile view and determine screen size bracket
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
      // On desktop, always show sidebar
      if (!mobileView) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Track scroll position to change menu button style
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Debug the user role being passed
  useEffect(() => {
    console.log("AuthenticatedLayout received userRole:", userRole);
  }, [userRole]);

  // Function to close the sidebar - passed to Sidebar component
  const closeSidebar = () => {
    if (isMobileView) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar container - uses absolute positioning in mobile to avoid layout shift */}
      <div 
        className={cn(
          "bg-gradient-to-b from-blue-100 to-teal-100 shadow-lg border-r border-blue-200",
          "transition-all duration-300 ease-in-out h-screen",
          isMobileView 
            ? "fixed top-0 left-0 z-50 w-64" 
            : "relative w-64",
          isMobileView && !isSidebarOpen && "transform -translate-x-full",
          // Adjust sidebar width for smallest screens
          screenSize === 'xs' && "w-56"
        )}
      >
        <Sidebar userRole={userRole} closeSidebar={closeSidebar} />
        
        {/* Close button is only needed in mobile view */}
        {isMobileView && isSidebarOpen && (
          <Button
            variant="ghost"
            className={cn(
              "absolute top-4 right-4 md:hidden text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-full",
              screenSize === 'xs' && "top-2 right-2",
              screenSize === 'sm' && "top-3 right-3"
            )}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className={cn("w-4 h-4", screenSize === 'xs' && "w-3 h-3")} />
          </Button>
        )}
      </div>

      {/* Main content - grows to fill available space */}
      <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        <Navbar handleLogout={handleLogout} user={user} screenSize={screenSize} />
        <main className={cn(
          "bg-gray-50 flex-1 overflow-y-auto",
          screenSize === 'xs' ? "p-2" : 
          screenSize === 'sm' ? "p-3" : 
          screenSize === 'md' ? "p-4" : "p-4 sm:p-6"
        )}>
          {/* Only show menu toggle button in mobile view */}
          {isMobileView && !isSidebarOpen && (
            <Button
              variant="ghost"
              className={cn(
                "bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 rounded-full shadow-md",
                screenSize === 'sm' && "ml-2", // Add specific margin for 359px-409px range
                screenSize === 'xs' && "mb-2",
                isScrolled 
                  ? "fixed top-4 left-4 z-50 bg-white shadow-lg transition-all duration-300"
                  : screenSize === 'sm' || screenSize === 'md' 
                    ? "absolute top-[3.6rem] left-3 z-40"
                    : "mb-4"
              )}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className={cn("w-6 h-6", screenSize === 'xs' && "w-5 h-5")} />
            </Button>
          )}
          <div 
            className={cn(
              // Add padding to the top when menu button is positioned absolutely
              (screenSize === 'sm' || screenSize === 'md') && isMobileView && !isSidebarOpen ? "pt-10" : ""
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay - only visible when sidebar is open on mobile */}
      {isMobileView && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
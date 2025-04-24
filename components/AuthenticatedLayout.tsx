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
  
  // Check if mobile view
  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 768;
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
          isMobileView && !isSidebarOpen && "transform -translate-x-full"
        )}
      >
        <Sidebar userRole={userRole} closeSidebar={closeSidebar} />
        
        {/* Close button is only needed in mobile view */}
        {isMobileView && isSidebarOpen && (
          <Button
            variant="ghost"
            className="absolute top-4 right-4 md:hidden text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-full"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Main content - grows to fill available space */}
      <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        <Navbar handleLogout={handleLogout} user={user} />
        <main className="p-4 sm:p-6 bg-gray-50 flex-1 overflow-y-auto">
          {/* Only show menu toggle button in mobile view */}
          {isMobileView && !isSidebarOpen && (
            <Button
              variant="ghost"
              className="mb-4 bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 rounded-full shadow-md"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          )}
          {children}
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
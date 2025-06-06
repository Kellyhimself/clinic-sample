import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { viewport } from "./viewport-meta";
import Script from "next/script";
import AnimatedBackground from '@/components/AnimatedBackground';
import Providers from '@/app/providers/Providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono ",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clinic & Pharmacy Management System",
  description: "A comprehensive system for managing clinic and pharmacy operations",
};

// Define viewport settings
export const viewportMeta = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
  userScalable: true,
};

// Export the viewport configuration
export { viewport };


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content={`width=${viewportMeta.width}, initial-scale=${viewportMeta.initialScale}, minimum-scale=${viewportMeta.minimumScale}, maximum-scale=${viewportMeta.maximumScale}, viewport-fit=${viewportMeta.viewportFit}, user-scalable=${viewportMeta.userScalable ? 'yes' : 'no'}`} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-x-hidden overflow-y-auto`}
      >
        <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
        <AnimatedBackground />
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
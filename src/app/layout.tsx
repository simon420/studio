import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a common sans-serif font
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { Suspense } from "react";
// import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider - Not needed with Zustand directly

// Keep Geist fonts if preferred, but ensure a sans-serif is default
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Product Finder', // Updated title
  description: 'Distributed product search application', // Updated description
};

export default function RootLayout({
  children,
  params, // Next.js provides params here if layout is part of a route group
}: Readonly<{
  children: React.ReactNode;
  params?: any; // Define more specifically if needed, e.g., { slug: string }
}>) {
  // This is a simple way to check if we are on login/register.
  // For more complex routing, consider using Next.js's path-based logic or context.
  // This example assumes login/register are top-level routes.
  // A more robust way might involve checking `usePathname()` in a client component wrapper if needed.
  // However, for layout, we rely on structure or a simpler check.
  // This check is conceptual; `params` might not directly give page name.
  // The best approach is to apply .login-page-container directly in login/register page.tsx.
  // Here, we conditionally wrap other pages.

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* Children will be either login/register page (with its own .login-page-container) 
            OR the main app content which will be wrapped below.
            This structure relies on login/register pages NOT being nested under a layout that applies .main-app-container.
            If they were, we'd need more complex conditional logic or separate layouts.
        */}
        <Suspense>
        {children}
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}

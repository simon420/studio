import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a common sans-serif font
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`} // Use font-sans utility class
      >
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}

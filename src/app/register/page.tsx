// src/app/register/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RegisterForm from '@/components/register-form'; // Import the reusable form
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="login-page-container p-4"> {/* Apply the class here */}
      <div className="login-page-content-grid grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl w-full items-center">
        {/* Left Column: Welcome Message */}
        <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left">
          <header className="max-w-md p-6 md:p-8 rounded-xl bg-card/80 backdrop-blur-md shadow-2xl">
            <div className="mx-auto md:mx-0 mb-6 flex items-center justify-center md:justify-start">
              <Image
                src="https://picsum.photos/100/100?data-ai-hint=secure+signup"
                alt="Product Finder App Logo"
                width={100}
                height={100}
                className="rounded-full shadow-lg object-cover"
                data-ai-hint="secure signup" 
              />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Join Product Finder
            </h1>
            <p className="text-lg lg:text-xl text-card-foreground/90">
              Create your account in just a few simple steps to start discovering and managing products with ease.
              We're excited to have you on board!
            </p>
          </header>
        </div>

        {/* Right Column: Registration Card */}
        <div className="flex items-center justify-center w-full">
          <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-md rounded-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
                <UserPlus className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
              <CardDescription className="text-card-foreground/80">
                Fill in the details below to register.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegisterForm /> {/* Use the reusable form component */}
              <p className="mt-6 text-center text-sm text-card-foreground/80">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary hover:text-primary/80 underline">
                  Login here
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

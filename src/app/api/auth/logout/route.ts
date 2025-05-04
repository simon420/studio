// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'auth_token';

export async function POST() {
  try {
    // Clear the authentication cookie by setting its maxAge to 0
    cookies().set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 0, // Expire immediately
      path: '/',
      sameSite: 'strict',
    });

    console.log('User logged out successfully.');
    return NextResponse.json({ message: 'Logout successful' }, { status: 200 });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}

// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';
import type { User, SessionPayload } from '@/lib/types';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_VERY_SECRET_KEY'; // Replace with a strong secret in .env.local
const COOKIE_NAME = 'auth_token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { username, password } = validation.data;

    // Find user by username
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    const userData = snapshot.docs[0].data() as User;
    const userId = snapshot.docs[0].id;

    // Compare password hash
    const isPasswordValid = await bcrypt.compare(password, userData.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Generate JWT
    const payload: SessionPayload = {
      userId,
      username: userData.username,
      role: userData.role,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

    // Set cookie
    cookies().set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
      maxAge: 60 * 60, // 1 hour
      path: '/',
      sameSite: 'strict',
    });

    console.log('User logged in successfully:', userId);
    return NextResponse.json({ message: 'Login successful', role: userData.role, username: userData.username }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}

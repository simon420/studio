// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import bcrypt from 'bcrypt';
import { adminDb } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'user']), // Allow specifying role during registration
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { username, password, role } = validation.data;

    // Check if username already exists
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();
    if (!snapshot.empty) {
      return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user document
    const newUser: Omit<User, 'id'> = {
      username,
      passwordHash,
      role,
    };

    const docRef = await usersRef.add(newUser);

    console.log('User registered successfully:', docRef.id);
    return NextResponse.json({ message: 'User registered successfully', userId: docRef.id }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}

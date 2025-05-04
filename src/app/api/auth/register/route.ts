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
      console.error('Registration validation failed:', validation.error.errors);
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { username, password, role } = validation.data;

    // Check if username already exists
    const usersRef = adminDb.collection('users');
    let snapshot;
    try {
      snapshot = await usersRef.where('username', '==', username).limit(1).get();
    } catch (dbError: any) {
        console.error('Firestore query error (checking username existence):', dbError);
        return NextResponse.json({ message: 'Error checking username availability. Please try again later.' }, { status: 500 });
    }

    if (!snapshot.empty) {
      console.log(`Registration attempt failed: Username "${username}" already exists.`);
      return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
    }

    // Hash the password
    let passwordHash;
    try {
        const saltRounds = 10;
        passwordHash = await bcrypt.hash(password, saltRounds);
    } catch (hashError: any) {
        console.error('Password hashing error:', hashError);
        return NextResponse.json({ message: 'Error securing password. Please try again later.' }, { status: 500 });
    }


    // Create new user document
    const newUser: Omit<User, 'id'> = {
      username,
      passwordHash,
      role,
    };

    let docRef;
    try {
        docRef = await usersRef.add(newUser);
    } catch (dbError: any) {
        console.error('Firestore add user error:', dbError);
        return NextResponse.json({ message: 'Error saving user data. Please try again later.' }, { status: 500 });
    }


    console.log('User registered successfully:', docRef.id);
    // Ensure we return a JSON response on success
    return NextResponse.json({ message: 'User registered successfully', userId: docRef.id }, { status: 201 });

  } catch (error: any) {
    // Catch unexpected errors (e.g., issues reading request body)
    console.error('Unexpected registration error:', error);
    // Ensure a JSON response is sent even for unexpected errors
    return NextResponse.json({ message: 'An internal server error occurred during registration.' }, { status: 500 });
  }
}

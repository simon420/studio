
// src/app/api/encrypt/route.ts
import { NextResponse } from 'next/server';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ message: 'Password is required.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    return NextResponse.json({ hashedPassword }, { status: 200 });
  } catch (error: any) {
    console.error('Encryption error:', error);
    return NextResponse.json({ message: 'Server error during encryption.' }, { status: 500 });
  }
}

    
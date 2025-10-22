// src/app/api/debug-key/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ message: 'La variabile d\'ambiente FIREBASE_PRIVATE_KEY non è stata trovata sul server.' }, { status: 404 });
    }
    return NextResponse.json({ privateKey }, { status: 200 });
  } catch (error: any) {
    console.error('API Error in debug-key:', error);
    return NextResponse.json({ message: 'Errore interno del server durante la lettura della chiave.' }, { status: 500 });
  }
}

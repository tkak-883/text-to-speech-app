import { NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function GET() {
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Google APIエラー', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Voices API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    );
  }
}
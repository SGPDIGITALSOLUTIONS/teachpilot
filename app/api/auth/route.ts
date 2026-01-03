import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const expectedUsername = process.env.TEACHPILOT_USERNAME || 'student';
    const expectedPassword = process.env.TEACHPILOT_PASSWORD || 'changeme';

    if (username === expectedUsername && password === expectedPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}


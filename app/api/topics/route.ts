import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM topics ORDER BY created_at DESC');
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, subject, description, color } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Topic name is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO topics (name, subject, description, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, subject || null, description || null, color || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create topic' },
      { status: 500 }
    );
  }
}


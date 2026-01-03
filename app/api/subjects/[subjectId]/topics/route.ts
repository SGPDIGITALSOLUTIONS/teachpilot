import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  try {
    const subjectId = parseInt(params.subjectId);
    const result = await pool.query(
      'SELECT * FROM topics WHERE subject_id = $1 ORDER BY created_at DESC',
      [subjectId]
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  try {
    const subjectId = parseInt(params.subjectId);
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Topic name is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO topics (subject_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [subjectId, name, description || null]
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



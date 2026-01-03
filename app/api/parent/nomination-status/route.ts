import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Get the most recent nomination (student_user_id is 1 for single user system)
    const result = await pool.query(
      'SELECT * FROM parent_nominations WHERE student_user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [1]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, nomination: null });
    }

    return NextResponse.json({ success: true, nomination: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check nomination status' },
      { status: 500 }
    );
  }
}


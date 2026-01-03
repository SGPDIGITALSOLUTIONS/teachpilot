import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const topicId = parseInt(params.topicId);
    const result = await pool.query(
      'SELECT * FROM revision_materials WHERE topic_id = $1 ORDER BY uploaded_at DESC',
      [topicId]
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}



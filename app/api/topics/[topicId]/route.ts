import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const topicId = parseInt(params.topicId);
    const result = await pool.query(
      'SELECT * FROM topics WHERE id = $1',
      [topicId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch topic' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const topicId = parseInt(params.topicId);
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Topic name is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE topics 
       SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name, description || null, topicId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update topic' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const topicId = parseInt(params.topicId);
    await pool.query('DELETE FROM topics WHERE id = $1', [topicId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete topic' },
      { status: 500 }
    );
  }
}


